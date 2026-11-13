package domain

import "time"

// Las rachas no se guardan: se calculan a partir de los check-ins cada vez que se
// consultan (specs/04 §1). Con ~50 personas y ≤7 check-ins por reto el costo es
// despreciable y no hace falta caché.

// PersonalStreak cuenta los días seguidos con actividad que terminan hoy o ayer.
//
// activityDays son los días de actividad de la persona en TODOS sus retos
// (Challenge.DateOfDay de cada check-in). Puede traer duplicados y venir en
// cualquier orden.
//
// Abierto (specs/02 §4): qué pasa con los días entre un reto y el siguiente. Con
// este cálculo esos días rompen la racha, porque no hay actividad. En la primera
// edición no afecta: solo hay un reto.
func PersonalStreak(activityDays []time.Time, today time.Time) int {
	active := make(map[int64]bool, len(activityDays))
	for _, d := range activityDays {
		active[dayIndex(d)] = true
	}
	return countBack(today, active)
}

// GroupDay resume un día de un reto para calcular la racha del grupo.
type GroupDay struct {
	Date      time.Time // día de calendario del reto (Challenge.DateOfDay)
	Enrolled  int       // personas inscritas hasta ese día
	Completed int       // de ellas, cuántas completaron ese día
}

// WonAsTeam indica si el día cuenta para la racha del grupo («ganado en equipo»):
// la fracción de inscritos que lo completó alcanza el umbral (specs/02 §4).
func (d GroupDay) WonAsTeam(threshold float64) bool {
	if d.Enrolled <= 0 || d.Completed <= 0 {
		return false
	}
	return float64(d.Completed)/float64(d.Enrolled) >= threshold
}

// GroupStreak cuenta los días seguidos ganados en equipo, terminando hoy o ayer.
func GroupStreak(days []GroupDay, today time.Time, threshold float64) int {
	won := make(map[int64]bool, len(days))
	for _, d := range days {
		if d.WonAsTeam(threshold) {
			won[dayIndex(d.Date)] = true
		}
	}
	return countBack(today, won)
}

// countBack cuenta días consecutivos marcados hacia atrás desde hoy. Que hoy aún
// no esté marcado no rompe la racha: todavía hay tiempo de completarlo.
func countBack(today time.Time, marked map[int64]bool) int {
	day := dayIndex(today)
	if !marked[day] {
		day--
	}
	n := 0
	for marked[day] {
		n++
		day--
	}
	return n
}
