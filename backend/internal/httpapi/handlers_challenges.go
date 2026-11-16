package httpapi

import (
	"cmp"
	"net/http"
	"slices"
	"strconv"
	"time"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// Rutas del reto (specs/03 §3).
//
// Reglas comunes:
//   - «Hoy» es domain.Today(s.now()); nunca una fecha que mande el cliente.
//   - No hay endpoint de inscripción: se crea sola con el primer check-in.
//   - Nunca se devuelve contenido (no existe en el servidor), ni el user_id de
//     otras personas, ni nombres de nivel del río (los traduce el front).

type challengeResponse struct {
	Slug      string                 `json:"slug"`
	Kind      string                 `json:"kind"`
	StartsOn  string                 `json:"starts_on"` // YYYY-MM-DD
	TotalDays int                    `json:"total_days"`
	Today     string                 `json:"today"`      // fecha de Bogotá
	DayNumber int                    `json:"day_number"` // ≤ 0 si no ha empezado; > total_days si terminó
	Status    domain.ChallengeStatus `json:"status"`     // not_started | in_progress | finished
	Enrolled  bool                   `json:"enrolled"`
}

type checkinDTO struct {
	DayNumber int  `json:"day_number"`
	WroteNote bool `json:"wrote_note"`
}

type challengeMeResponse struct {
	Enrolled       bool         `json:"enrolled"`
	JoinedDay      *int         `json:"joined_day"` // día del reto de su primer check-in; null si no está inscrita
	Checkins       []checkinDTO `json:"checkins"`
	CompletedCount int          `json:"completed_count"`
	WrittenCount   int          `json:"written_count"`
	Streak         int          `json:"streak"`
}

type checkinRequest struct {
	WroteNote     bool `json:"wrote_note"`
	AcceptedTerms bool `json:"accepted_terms"` // obligatorio (true) en el primer día
}

type wallMember struct {
	Nickname       string     `json:"nickname"`
	CompletedCount int        `json:"completed_count"`
	Streak         int        `json:"streak"`
	LastActivityAt *time.Time `json:"last_activity_at"`
}

type wallResponse struct {
	Members []wallMember `json:"members"`
}

type riverResponse struct {
	TotalCheckins    int `json:"total_checkins"`
	PossibleCheckins int `json:"possible_checkins"`
	GroupStreak      int `json:"group_streak"`
}

// challengeFor busca el reto {slug}. Si falla, ya respondió.
func (s *server) challengeFor(w http.ResponseWriter, r *http.Request) (domain.Challenge, bool) {
	c, err := s.store.ChallengeBySlug(r.Context(), r.PathValue("slug"))
	if err != nil {
		s.fail(w, r, err)
		return domain.Challenge{}, false
	}
	return c, true
}

// GET /v1/challenges/{slug} — miembro. Datos del reto y qué día es hoy.
func (s *server) handleGetChallenge(w http.ResponseWriter, r *http.Request) {
	c, ok := s.challengeFor(w, r)
	if !ok {
		return
	}
	_, enrolled, err := s.store.Enrollment(r.Context(), currentUser(r).ID, c.ID)
	if err != nil {
		s.fail(w, r, err)
		return
	}
	today := domain.Today(s.now())
	writeJSON(w, http.StatusOK, challengeResponse{
		Slug:      c.Slug,
		Kind:      c.Kind,
		StartsOn:  c.StartsOn.Format(domain.DateLayout),
		TotalDays: c.TotalDays,
		Today:     today.Format(domain.DateLayout),
		DayNumber: c.DayNumber(today),
		Status:    c.Status(today),
		Enrolled:  enrolled,
	})
}

// GET /v1/challenges/{slug}/me — miembro. Mi avance y mi racha. Si aún no completó
// ningún día responde enrolled=false con listas vacías (no es un error).
func (s *server) handleChallengeMe(w http.ResponseWriter, r *http.Request) {
	c, ok := s.challengeFor(w, r)
	if !ok {
		return
	}
	u := currentUser(r)

	e, enrolled, err := s.store.Enrollment(r.Context(), u.ID, c.ID)
	if err != nil {
		s.fail(w, r, err)
		return
	}
	activity, err := s.store.ActivityDays(r.Context(), []string{u.ID})
	if err != nil {
		s.fail(w, r, err)
		return
	}

	resp := challengeMeResponse{
		Enrolled: enrolled,
		Checkins: []checkinDTO{},
		Streak:   domain.PersonalStreak(activity[u.ID], domain.Today(s.now())),
	}
	if enrolled {
		joined := c.JoinedDay(e.JoinedOn)
		resp.JoinedDay = &joined

		checkins, err := s.store.Checkins(r.Context(), e.ID)
		if err != nil {
			s.fail(w, r, err)
			return
		}
		resp.CompletedCount = len(checkins)
		for _, ck := range checkins {
			resp.Checkins = append(resp.Checkins, checkinDTO{DayNumber: ck.DayNumber, WroteNote: ck.WroteNote})
			if ck.WroteNote {
				resp.WrittenCount++
			}
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

// PUT /v1/challenges/{slug}/checkins/{day} — miembro. Marcar el día de hoy.
//
// Cuerpo: { "wrote_note": bool, "accepted_terms": bool }. Solo se completa el día
// de hoy (hora de Bogotá). Si es el primer día de la persona, accepted_terms debe
// ser true y la inscripción se crea en la misma transacción. Idempotente: 201 la
// primera vez, 200 si ya existía (y actualiza wrote_note).
func (s *server) handlePutCheckin(w http.ResponseWriter, r *http.Request) {
	day, err := strconv.Atoi(r.PathValue("day"))
	if err != nil {
		s.fail(w, r, domain.ErrInvalidDay)
		return
	}
	var req checkinRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	c, ok := s.challengeFor(w, r)
	if !ok {
		return
	}
	u := currentUser(r)
	now := s.now()
	today := domain.Today(now)

	if err := c.ValidateCheckin(day, today); err != nil {
		s.fail(w, r, err)
		return
	}
	_, enrolled, err := s.store.Enrollment(r.Context(), u.ID, c.ID)
	if err != nil {
		s.fail(w, r, err)
		return
	}
	if !enrolled && !req.AcceptedTerms {
		s.fail(w, r, domain.ErrTermsNotAccepted)
		return
	}

	ck, created, err := s.store.RecordCheckin(r.Context(), domain.NewCheckin{
		UserID:      u.ID,
		ChallengeID: c.ID,
		Day:         day,
		CompletedOn: today,
		WroteNote:   req.WroteNote,
		At:          now,
	})
	if err != nil {
		s.fail(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, checkinDTO{DayNumber: ck.DayNumber, WroteNote: ck.WroteNote})
}

// GET /v1/challenges/{slug}/wall?order=recent|alpha — miembro. Muro del grupo.
//
// Solo personas inscritas (completaron al menos un día) con show_on_wall. Sin
// ranking por puntaje (specs/02 §6): por actividad reciente (por defecto) o
// alfabéticamente.
func (s *server) handleWall(w http.ResponseWriter, r *http.Request) {
	order := r.URL.Query().Get("order")
	if order == "" {
		order = "recent"
	}
	if order != "recent" && order != "alpha" {
		writeError(w, "invalid_query")
		return
	}
	c, ok := s.challengeFor(w, r)
	if !ok {
		return
	}

	members, err := s.store.WallMembers(r.Context(), c.ID)
	if err != nil {
		s.fail(w, r, err)
		return
	}
	ids := make([]string, len(members))
	for i, m := range members {
		ids[i] = m.UserID
	}
	activity, err := s.store.ActivityDays(r.Context(), ids)
	if err != nil {
		s.fail(w, r, err)
		return
	}

	today := domain.Today(s.now())
	resp := wallResponse{Members: make([]wallMember, 0, len(members))}
	for _, m := range members {
		wm := wallMember{
			Nickname:       m.Nickname,
			CompletedCount: m.CompletedCount,
			Streak:         domain.PersonalStreak(activity[m.UserID], today),
		}
		if m.LastActivityAt != nil {
			t := m.LastActivityAt.UTC()
			wm.LastActivityAt = &t
		}
		resp.Members = append(resp.Members, wm)
	}
	sortWall(resp.Members, order)
	writeJSON(w, http.StatusOK, resp)
}

// sortWall ordena el muro: «recent» pone primero a quien marcó más recientemente;
// «alpha», por nickname.
func sortWall(members []wallMember, order string) {
	slices.SortFunc(members, func(a, b wallMember) int {
		if order == "recent" {
			switch {
			case a.LastActivityAt != nil && b.LastActivityAt != nil:
				if c := b.LastActivityAt.Compare(*a.LastActivityAt); c != 0 {
					return c
				}
			case a.LastActivityAt != nil:
				return -1
			case b.LastActivityAt != nil:
				return 1
			}
		}
		return cmp.Compare(a.Nickname, b.Nickname)
	})
}

// GET /v1/challenges/{slug}/river — miembro. Río del grupo y racha del grupo.
//
// Se mide contra las personas inscritas, también las que ocultan su muro (es un
// agregado sin nombres). El río es proporcional: check-ins hechos / posibles,
// contando para cada persona desde el día en que se inscribió (specs/02 §5).
func (s *server) handleRiver(w http.ResponseWriter, r *http.Request) {
	c, ok := s.challengeFor(w, r)
	if !ok {
		return
	}
	activity, err := s.store.ChallengeActivity(r.Context(), c.ID)
	if err != nil {
		s.fail(w, r, err)
		return
	}

	today := domain.Today(s.now())
	resp := riverResponse{
		PossibleCheckins: c.PossibleCheckins(activity, today),
		GroupStreak:      domain.GroupStreak(c.GroupDays(activity, today), today, c.GroupStreakThreshold),
	}
	for _, a := range activity {
		resp.TotalCheckins += len(a.Days)
	}
	writeJSON(w, http.StatusOK, resp)
}
