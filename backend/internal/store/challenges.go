package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// ChallengeBySlug busca un reto y valida su config según su kind.
func (p *Postgres) ChallengeBySlug(ctx context.Context, slug string) (domain.Challenge, error) {
	var id, kind, config string
	var startsOn *time.Time
	err := p.pool.QueryRow(ctx,
		`SELECT id::text, kind, starts_on, config::text FROM challenges WHERE slug = $1`, slug,
	).Scan(&id, &kind, &startsOn, &config)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Challenge{}, domain.ErrNotFound
	}
	if err != nil {
		return domain.Challenge{}, err
	}
	return domain.BuildChallenge(id, slug, kind, startsOn, []byte(config))
}

// Enrollment devuelve la inscripción de la persona al reto, si existe.
func (p *Postgres) Enrollment(ctx context.Context, userID, challengeID string) (domain.Enrollment, bool, error) {
	var e domain.Enrollment
	err := p.pool.QueryRow(ctx,
		`SELECT id::text, (joined_at AT TIME ZONE $3)::date
		 FROM enrollments WHERE user_id = $1 AND challenge_id = $2`,
		userID, challengeID, domain.Bogota.String(),
	).Scan(&e.ID, &e.JoinedOn)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Enrollment{}, false, nil
	}
	return e, err == nil, err
}

// RecordCheckin marca un día. En una sola transacción (specs/04 §4):
//
//  1. crea la inscripción si es el primer día (inscripción implícita); los únicos
//     de la base hacen que dos pulsaciones simultáneas no creen dos;
//  2. hace upsert del check-in: repetirlo no duplica y actualiza wrote_note.
//
// Devuelve si el check-in se creó en esta llamada.
func (p *Postgres) RecordCheckin(ctx context.Context, in domain.NewCheckin) (domain.Checkin, bool, error) {
	var ck domain.Checkin
	var created bool
	at := in.At.UTC().Format(time.RFC3339Nano)
	err := pgx.BeginFunc(ctx, p.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx,
			`INSERT INTO enrollments (user_id, challenge_id, joined_at)
			 VALUES ($1, $2, $3::timestamptz)
			 ON CONFLICT (user_id, challenge_id) DO NOTHING`,
			in.UserID, in.ChallengeID, at); err != nil {
			return err
		}
		return tx.QueryRow(ctx,
			`INSERT INTO checkins (enrollment_id, day_number, completed_on, wrote_note, created_at)
			 SELECT e.id, $3, $4::date, $5, $6::timestamptz
			 FROM enrollments e WHERE e.user_id = $1 AND e.challenge_id = $2
			 ON CONFLICT (enrollment_id, day_number)
			 DO UPDATE SET wrote_note = EXCLUDED.wrote_note
			 RETURNING day_number, wrote_note, completed_on, (xmax = 0)`,
			in.UserID, in.ChallengeID, in.Day, in.CompletedOn.Format(domain.DateLayout), in.WroteNote, at,
		).Scan(&ck.DayNumber, &ck.WroteNote, &ck.CompletedOn, &created)
	})
	return ck, created, err
}

// Checkins devuelve los días completados de una inscripción, en orden.
func (p *Postgres) Checkins(ctx context.Context, enrollmentID string) ([]domain.Checkin, error) {
	rows, err := p.pool.Query(ctx,
		`SELECT day_number, wrote_note, completed_on
		 FROM checkins WHERE enrollment_id = $1 ORDER BY day_number`,
		enrollmentID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.Checkin, error) {
		var ck domain.Checkin
		err := row.Scan(&ck.DayNumber, &ck.WroteNote, &ck.CompletedOn)
		return ck, err
	})
}

// ActivityDays devuelve, por persona, sus días de actividad en TODOS los retos:
// el día de calendario al que pertenece cada check-in (starts_on + day_number − 1).
// Es la entrada de domain.PersonalStreak.
func (p *Postgres) ActivityDays(ctx context.Context, userIDs []string) (map[string][]time.Time, error) {
	out := make(map[string][]time.Time, len(userIDs))
	if len(userIDs) == 0 {
		return out, nil
	}
	rows, err := p.pool.Query(ctx,
		`SELECT e.user_id::text, c.starts_on + (ck.day_number - 1)
		 FROM checkins ck
		 JOIN enrollments e ON e.id = ck.enrollment_id
		 JOIN challenges c ON c.id = e.challenge_id
		 WHERE e.user_id = ANY($1::uuid[]) AND c.starts_on IS NOT NULL`,
		userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var userID string
		var day time.Time
		if err := rows.Scan(&userID, &day); err != nil {
			return nil, err
		}
		out[userID] = append(out[userID], day)
	}
	return out, rows.Err()
}

// WallMembers devuelve a las personas inscritas en el reto (completaron al menos
// un día) que aparecen en el muro, con cuántos días completaron y cuándo marcaron
// el último.
func (p *Postgres) WallMembers(ctx context.Context, challengeID string) ([]domain.WallMember, error) {
	rows, err := p.pool.Query(ctx,
		`SELECT u.id::text, u.nickname, count(ck.id), max(ck.created_at)
		 FROM enrollments e
		 JOIN users u ON u.id = e.user_id
		 LEFT JOIN checkins ck ON ck.enrollment_id = e.id
		 WHERE e.challenge_id = $1 AND u.show_on_wall
		 GROUP BY u.id, u.nickname`,
		challengeID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.WallMember, error) {
		var m domain.WallMember
		err := row.Scan(&m.UserID, &m.Nickname, &m.CompletedCount, &m.LastActivityAt)
		return m, err
	})
}

// ChallengeActivity devuelve todas las inscripciones del reto (aparezcan o no en
// el muro: el río es un agregado sin nombres) con su fecha de inscripción en
// Bogotá y los días que completaron. Es la entrada del río y de la racha del grupo.
func (p *Postgres) ChallengeActivity(ctx context.Context, challengeID string) ([]domain.EnrollmentActivity, error) {
	rows, err := p.pool.Query(ctx,
		`SELECT (e.joined_at AT TIME ZONE $2)::date,
		        coalesce(array_agg(ck.day_number ORDER BY ck.day_number)
		                 FILTER (WHERE ck.id IS NOT NULL), '{}')
		 FROM enrollments e
		 LEFT JOIN checkins ck ON ck.enrollment_id = e.id
		 WHERE e.challenge_id = $1
		 GROUP BY e.id`,
		challengeID, domain.Bogota.String())
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (domain.EnrollmentActivity, error) {
		var a domain.EnrollmentActivity
		err := row.Scan(&a.JoinedOn, &a.Days)
		return a, err
	})
}
