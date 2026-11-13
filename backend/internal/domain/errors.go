// Package domain contiene las reglas del negocio: el día en Bogotá, el bloqueo
// diario, las rachas, el río y la validación y el filtro de nicknames. No hace I/O
// ni conoce HTTP ni la base de datos, para poder probarlo con tests unitarios
// (specs/03 §1 y §9).
package domain

// Error es un error de regla de negocio con un código estable que el cliente puede
// interpretar. httpapi traduce cada código a un estado HTTP y a un mensaje en español.
type Error struct {
	Code string
}

func (e *Error) Error() string { return e.Code }

// Errores de dominio. Cada código debe tener entrada en el catálogo de httpapi.
var (
	ErrNotFound            = &Error{Code: "not_found"}
	ErrInvalidNickname     = &Error{Code: "invalid_nickname"}
	ErrNicknameNotAllowed  = &Error{Code: "nickname_not_allowed"}
	ErrNicknameTaken       = &Error{Code: "nickname_taken"}
	ErrTermsNotAccepted    = &Error{Code: "terms_not_accepted"}
	ErrInvalidDay          = &Error{Code: "invalid_day"}
	ErrChallengeNotStarted = &Error{Code: "challenge_not_started"}
	ErrChallengeClosed     = &Error{Code: "challenge_closed"}
	ErrDayInFuture         = &Error{Code: "day_in_future"}
	ErrDayClosed           = &Error{Code: "day_closed"}
)

// AllErrors lista todos los errores de dominio (lo usa un test de httpapi para
// verificar que ninguno quede sin traducir).
var AllErrors = []*Error{
	ErrNotFound, ErrInvalidNickname, ErrNicknameNotAllowed, ErrNicknameTaken,
	ErrTermsNotAccepted, ErrInvalidDay, ErrChallengeNotStarted, ErrChallengeClosed,
	ErrDayInFuture, ErrDayClosed,
}
