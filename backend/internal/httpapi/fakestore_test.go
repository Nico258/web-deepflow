package httpapi

import (
	"cmp"
	"context"
	"fmt"
	"slices"
	"sync"
	"time"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// clock es un reloj que los tests pueden mover.
type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.t
}

// SetBogota pone el reloj en una fecha y hora de Bogotá, p. ej. "2026-11-16 10:00".
func (c *clock) SetBogota(s string) {
	t, err := time.ParseInLocation("2006-01-02 15:04", s, domain.Bogota)
	if err != nil {
		panic(err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.t = t
}

type fakeEnrollment struct {
	id, userID, challengeID string
	joinedAt                time.Time
	checkins                map[int]*fakeCheckin
}

type fakeCheckin struct {
	domain.Checkin
	createdAt time.Time
}

// fakeStore es un Store en memoria para probar httpapi sin base de datos. Imita
// las restricciones de la migración (únicos y cascadas).
type fakeStore struct {
	mu          sync.Mutex
	pingErr     error
	users       map[string]domain.User // id → user
	tokens      map[string]string      // token hash → user id
	challenges  []domain.Challenge
	enrollments []*fakeEnrollment
	nextID      int
}

func newFakeStore() *fakeStore {
	return &fakeStore{users: map[string]domain.User{}, tokens: map[string]string{}}
}

func (f *fakeStore) id(prefix string) string {
	f.nextID++
	return fmt.Sprintf("%s-%d", prefix, f.nextID)
}

func (f *fakeStore) addChallenge(c domain.Challenge) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if c.ID == "" {
		c.ID = f.id("challenge")
	}
	f.challenges = append(f.challenges, c)
}

func (f *fakeStore) Ping(context.Context) error { return f.pingErr }

func (f *fakeStore) UserByTokenHash(_ context.Context, h []byte) (domain.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[f.tokens[string(h)]]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	return u, nil
}

func (f *fakeStore) CreateUser(_ context.Context, nu domain.NewUser) (domain.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, u := range f.users {
		if u.Nickname == nu.Nickname {
			return domain.User{}, domain.ErrNicknameTaken
		}
	}
	u := domain.User{ID: f.id("user"), Nickname: nu.Nickname, ShowOnWall: true}
	f.users[u.ID] = u
	f.tokens[string(nu.TokenHash)] = u.ID
	return u, nil
}

func (f *fakeStore) SetShowOnWall(_ context.Context, id string, show bool) (domain.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[id]
	if !ok {
		return domain.User{}, domain.ErrNotFound
	}
	u.ShowOnWall = show
	f.users[id] = u
	return u, nil
}

func (f *fakeStore) DeleteUser(_ context.Context, id string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.users, id)
	f.enrollments = slices.DeleteFunc(f.enrollments, func(e *fakeEnrollment) bool { return e.userID == id })
	return nil
}

func (f *fakeStore) ChallengeBySlug(_ context.Context, slug string) (domain.Challenge, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, c := range f.challenges {
		if c.Slug == slug {
			return c, nil
		}
	}
	return domain.Challenge{}, domain.ErrNotFound
}

func (f *fakeStore) findEnrollment(userID, challengeID string) *fakeEnrollment {
	for _, e := range f.enrollments {
		if e.userID == userID && e.challengeID == challengeID {
			return e
		}
	}
	return nil
}

func (f *fakeStore) Enrollment(_ context.Context, userID, challengeID string) (domain.Enrollment, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if e := f.findEnrollment(userID, challengeID); e != nil {
		return domain.Enrollment{ID: e.id, JoinedOn: domain.Today(e.joinedAt)}, true, nil
	}
	return domain.Enrollment{}, false, nil
}

func (f *fakeStore) RecordCheckin(_ context.Context, in domain.NewCheckin) (domain.Checkin, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	e := f.findEnrollment(in.UserID, in.ChallengeID)
	if e == nil { // inscripción implícita
		e = &fakeEnrollment{
			id: f.id("enrollment"), userID: in.UserID, challengeID: in.ChallengeID,
			joinedAt: in.At, checkins: map[int]*fakeCheckin{},
		}
		f.enrollments = append(f.enrollments, e)
	}
	if ck, ok := e.checkins[in.Day]; ok {
		ck.WroteNote = in.WroteNote
		return ck.Checkin, false, nil
	}
	ck := &fakeCheckin{
		Checkin:   domain.Checkin{DayNumber: in.Day, WroteNote: in.WroteNote, CompletedOn: in.CompletedOn},
		createdAt: in.At,
	}
	e.checkins[in.Day] = ck
	return ck.Checkin, true, nil
}

func (f *fakeStore) Checkins(_ context.Context, enrollmentID string) ([]domain.Checkin, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []domain.Checkin
	for _, e := range f.enrollments {
		if e.id == enrollmentID {
			for _, ck := range e.checkins {
				out = append(out, ck.Checkin)
			}
		}
	}
	slices.SortFunc(out, func(a, b domain.Checkin) int { return cmp.Compare(a.DayNumber, b.DayNumber) })
	return out, nil
}

func (f *fakeStore) challengeByID(id string) domain.Challenge {
	for _, c := range f.challenges {
		if c.ID == id {
			return c
		}
	}
	return domain.Challenge{}
}

func (f *fakeStore) ActivityDays(_ context.Context, userIDs []string) (map[string][]time.Time, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := map[string][]time.Time{}
	for _, e := range f.enrollments {
		if !slices.Contains(userIDs, e.userID) {
			continue
		}
		c := f.challengeByID(e.challengeID)
		for day := range e.checkins {
			out[e.userID] = append(out[e.userID], c.DateOfDay(day))
		}
	}
	return out, nil
}

func (f *fakeStore) WallMembers(_ context.Context, challengeID string) ([]domain.WallMember, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []domain.WallMember
	for _, e := range f.enrollments {
		u := f.users[e.userID]
		if e.challengeID != challengeID || !u.ShowOnWall {
			continue
		}
		m := domain.WallMember{UserID: u.ID, Nickname: u.Nickname, CompletedCount: len(e.checkins)}
		for _, ck := range e.checkins {
			if m.LastActivityAt == nil || ck.createdAt.After(*m.LastActivityAt) {
				t := ck.createdAt
				m.LastActivityAt = &t
			}
		}
		out = append(out, m)
	}
	return out, nil
}

func (f *fakeStore) ChallengeActivity(_ context.Context, challengeID string) ([]domain.EnrollmentActivity, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []domain.EnrollmentActivity
	for _, e := range f.enrollments {
		if e.challengeID != challengeID {
			continue
		}
		a := domain.EnrollmentActivity{JoinedOn: domain.Today(e.joinedAt)}
		for day := range e.checkins {
			a.Days = append(a.Days, day)
		}
		slices.Sort(a.Days)
		out = append(out, a)
	}
	return out, nil
}
