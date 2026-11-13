package domain

import (
	"fmt"
	"slices"
	"time"
)

// ChallengeStatus es el estado de un reto respecto a hoy.
type ChallengeStatus string

const (
	ChallengeNotStarted ChallengeStatus = "not_started"
	ChallengeInProgress ChallengeStatus = "in_progress"
	ChallengeFinished   ChallengeStatus = "finished"
)

// Challenge es un reto de tipo daily_steps listo para aplicar las reglas.
type Challenge struct {
	ID                   string
	Slug                 string
	Kind                 string
	StartsOn             time.Time // día de calendario, medianoche UTC
	TotalDays            int       // de config.total_days
	GroupStreakThreshold float64   // de config.group_streak_threshold
}

// BuildChallenge arma un reto a partir de su fila en la base y valida que su
// config tenga la forma que exige su kind (specs/03 §4). Un reto mal formado es
// un error de datos (500), no del cliente.
func BuildChallenge(id, slug, kind string, startsOn *time.Time, config []byte) (Challenge, error) {
	if kind != KindDailySteps {
		return Challenge{}, fmt.Errorf("reto %s: tipo %q no soportado", slug, kind)
	}
	if startsOn == nil {
		return Challenge{}, fmt.Errorf("reto %s: un reto daily_steps necesita starts_on", slug)
	}
	cfg, err := ParseDailyStepsConfig(config)
	if err != nil {
		return Challenge{}, fmt.Errorf("reto %s: %w", slug, err)
	}
	return Challenge{
		ID:                   id,
		Slug:                 slug,
		Kind:                 kind,
		StartsOn:             CalendarDate(*startsOn),
		TotalDays:            cfg.TotalDays,
		GroupStreakThreshold: cfg.GroupStreakThreshold,
	}, nil
}

// DayNumber devuelve en qué día del reto va el grupo: (today − starts_on) + 1.
// Es ≤ 0 si el reto aún no empieza y > TotalDays si ya terminó.
func (c Challenge) DayNumber(today time.Time) int {
	return DaysBetween(c.StartsOn, today) + 1
}

// Status devuelve si el reto aún no empieza, está en curso o terminó.
func (c Challenge) Status(today time.Time) ChallengeStatus {
	switch n := c.DayNumber(today); {
	case n < 1:
		return ChallengeNotStarted
	case n > c.TotalDays:
		return ChallengeFinished
	default:
		return ChallengeInProgress
	}
}

// DateOfDay devuelve el día de calendario al que pertenece el día n del reto
// (starts_on + n − 1). Es el «día de actividad» con que se cuentan las rachas.
func (c Challenge) DateOfDay(n int) time.Time {
	return c.StartsOn.AddDate(0, 0, n-1)
}

// ValidateCheckin aplica las reglas para marcar el día `day` estando en `today`
// (specs/02 §3 y specs/03 §4): cada día solo se completa ese mismo día; a
// medianoche de Bogotá se bloquea. Se valida siempre en el servidor, aunque el
// front ya oculte esas opciones.
func (c Challenge) ValidateCheckin(day int, today time.Time) error {
	if day < 1 || day > c.TotalDays {
		return ErrInvalidDay
	}
	current := c.DayNumber(today)
	switch {
	case current < 1:
		return ErrChallengeNotStarted
	case current > c.TotalDays:
		return ErrChallengeClosed
	case day > current:
		return ErrDayInFuture
	case day < current:
		return ErrDayClosed
	}
	return nil
}

// JoinedDay devuelve el día del reto en que la persona se inscribió (el de su
// primer check-in).
func (c Challenge) JoinedDay(joinedOn time.Time) int {
	return max(1, c.DayNumber(joinedOn))
}

// EnrollmentActivity es una inscripción al reto y los días que completó.
type EnrollmentActivity struct {
	JoinedOn time.Time // día de calendario (Bogotá) en que se inscribió
	Days     []int     // días del reto completados
}

// PossibleCheckins es el denominador del río del grupo (specs/02 §5): por cada
// persona inscrita, los días desde el de su inscripción hasta hoy (o hasta el
// último día del reto). Así quien llega tarde no baja el río por días en que no
// podía participar.
func (c Challenge) PossibleCheckins(members []EnrollmentActivity, today time.Time) int {
	last := min(c.DayNumber(today), c.TotalDays)
	total := 0
	for _, m := range members {
		if first := c.JoinedDay(m.JoinedOn); last >= first {
			total += last - first + 1
		}
	}
	return total
}

// GroupDays resume cada día del reto, del 1 hasta hoy (o hasta el último día),
// para calcular la racha del grupo. Cada día cuenta solo a las personas inscritas
// hasta ese día (specs/02 §4): quien llega tarde no cuenta en los días anteriores
// a su llegada.
func (c Challenge) GroupDays(members []EnrollmentActivity, today time.Time) []GroupDay {
	last := min(c.DayNumber(today), c.TotalDays)
	days := make([]GroupDay, 0, max(last, 0))
	for d := 1; d <= last; d++ {
		gd := GroupDay{Date: c.DateOfDay(d)}
		for _, m := range members {
			if dayIndex(m.JoinedOn) > dayIndex(gd.Date) {
				continue
			}
			gd.Enrolled++
			if slices.Contains(m.Days, d) {
				gd.Completed++
			}
		}
		days = append(days, gd)
	}
	return days
}
