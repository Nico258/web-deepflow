package httpapi

import (
	"context"
	"time"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// Store es lo que httpapi necesita de la persistencia; store.Postgres lo implementa.
//
// Convenciones:
//   - si algo no existe, devolver domain.ErrNotFound;
//   - si choca una restricción con sentido de negocio, devolver el error de dominio
//     correspondiente (p. ej. domain.ErrNicknameTaken);
//   - cualquier otro error se responde como 500.
type Store interface {
	// Ping ejecuta una consulta real: mantiene despierta la base de Supabase (specs/00 §4).
	Ping(ctx context.Context) error

	// Identidad
	UserByTokenHash(ctx context.Context, tokenHash []byte) (domain.User, error)
	CreateUser(ctx context.Context, u domain.NewUser) (domain.User, error)
	SetShowOnWall(ctx context.Context, userID string, show bool) (domain.User, error)
	DeleteUser(ctx context.Context, userID string) error

	// Reto
	ChallengeBySlug(ctx context.Context, slug string) (domain.Challenge, error)
	Enrollment(ctx context.Context, userID, challengeID string) (e domain.Enrollment, found bool, err error)
	// RecordCheckin crea la inscripción si es el primer día y marca el día, en una transacción.
	RecordCheckin(ctx context.Context, in domain.NewCheckin) (ck domain.Checkin, created bool, err error)
	Checkins(ctx context.Context, enrollmentID string) ([]domain.Checkin, error)
	ActivityDays(ctx context.Context, userIDs []string) (map[string][]time.Time, error)
	WallMembers(ctx context.Context, challengeID string) ([]domain.WallMember, error)
	ChallengeActivity(ctx context.Context, challengeID string) ([]domain.EnrollmentActivity, error)
}
