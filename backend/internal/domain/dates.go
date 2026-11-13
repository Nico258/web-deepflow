package domain

import (
	"fmt"
	"time"

	_ "time/tzdata" // incrusta la base de zonas horarias: los contenedores mínimos no la traen (specs/00 §5)
)

// Bogota es la zona que define «hoy» para todos los retos. El servidor decide el
// día; nunca se confía en el reloj del dispositivo (specs/00 §2).
var Bogota = mustLoadLocation("America/Bogota")

// DateLayout es el formato en que viajan las fechas de calendario por JSON.
const DateLayout = time.DateOnly // "2006-01-02"

// Las fechas de calendario (columnas date: starts_on, completed_on) se representan
// como time.Time a medianoche UTC, que es como pgx lee el tipo date de Postgres.

// CalendarDate devuelve el día de calendario de t (según la zona de t) a medianoche UTC.
func CalendarDate(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

// Today devuelve el día de calendario actual en Bogotá. El día nuevo se abre a
// medianoche de Bogotá, no del servidor ni de la persona.
func Today(now time.Time) time.Time {
	return CalendarDate(now.In(Bogota))
}

// DaysBetween devuelve cuántos días de calendario van de a hasta b (negativo si b es anterior).
func DaysBetween(a, b time.Time) int {
	return int(dayIndex(b) - dayIndex(a))
}

// dayIndex numera los días de calendario de forma consecutiva (días desde 1970-01-01).
func dayIndex(t time.Time) int64 {
	return CalendarDate(t).Unix() / 86400
}

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic(fmt.Sprintf("no se pudo cargar la zona %s: %v", name, err))
	}
	return loc
}
