package domain

import "time"

// Checkin es un día completado. Solo se guarda que se completó y si la persona
// escribió; nunca el texto (specs/00 §3).
type Checkin struct {
	DayNumber   int
	WroteNote   bool
	CompletedOn time.Time // fecha de Bogotá en que se registró (siempre la del propio día)
}

// NewCheckin son los datos para registrar un día completado.
type NewCheckin struct {
	UserID      string
	ChallengeID string
	Day         int
	CompletedOn time.Time // hoy en Bogotá
	WroteNote   bool
	// At es el instante del registro. Si es el primer día, es también el joined_at
	// de la inscripción: el registro de cuándo la persona aceptó el aviso.
	At time.Time
}

// Enrollment es la inscripción de una persona a un reto. Se crea sola con su
// primer check-in (specs/02 §3).
type Enrollment struct {
	ID       string
	JoinedOn time.Time // día de calendario (Bogotá) de la inscripción
}

// WallMember es una persona en el muro del grupo.
type WallMember struct {
	UserID         string // interno, para calcular la racha: nunca sale en la respuesta
	Nickname       string
	CompletedCount int
	LastActivityAt *time.Time // cuándo marcó su último día
}
