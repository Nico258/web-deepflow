package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// Nombre de la restricción única de users.nickname en migrations/0001_init.sql.
const nicknameUniqueConstraint = "users_nickname_key"

const pgUniqueViolation = "23505"

const userColumns = `id::text, nickname, show_on_wall`

func scanUser(row pgx.Row) (domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Nickname, &u.ShowOnWall)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ErrNotFound
	}
	return u, err
}

// UserByTokenHash busca a la persona dueña del token (por users.token_hash, único).
func (p *Postgres) UserByTokenHash(ctx context.Context, tokenHash []byte) (domain.User, error) {
	return scanUser(p.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE token_hash = $1`, tokenHash))
}

// CreateUser registra a una persona. Si el nickname ya existe devuelve
// domain.ErrNicknameTaken (opción A de specs/00 §3: no se entra en cuentas ajenas).
func (p *Postgres) CreateUser(ctx context.Context, nu domain.NewUser) (domain.User, error) {
	u, err := scanUser(p.pool.QueryRow(ctx,
		`INSERT INTO users (nickname, token_hash) VALUES ($1, $2) RETURNING `+userColumns,
		nu.Nickname, nu.TokenHash))

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation && pgErr.ConstraintName == nicknameUniqueConstraint {
		return domain.User{}, domain.ErrNicknameTaken
	}
	return u, err
}

// SetShowOnWall cambia si la persona aparece en el muro y devuelve el perfil actualizado.
func (p *Postgres) SetShowOnWall(ctx context.Context, userID string, show bool) (domain.User, error) {
	return scanUser(p.pool.QueryRow(ctx,
		`UPDATE users SET show_on_wall = $2 WHERE id = $1 RETURNING `+userColumns,
		userID, show))
}

// DeleteUser borra a la persona; ON DELETE CASCADE limpia inscripciones y
// check-ins, y su nickname queda libre.
func (p *Postgres) DeleteUser(ctx context.Context, userID string) error {
	_, err := p.pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, userID)
	return err
}
