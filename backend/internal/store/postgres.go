// Package store implementa la persistencia en Postgres (Supabase) con pgx.
//
// Implementa la interfaz httpapi.Store. Traduce pgx.ErrNoRows a domain.ErrNotFound
// y las violaciones de restricciones con sentido de negocio a errores de dominio.
package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Postgres es el acceso a la base. Es seguro para uso concurrente.
type Postgres struct {
	pool *pgxpool.Pool
}

// maxConns basta para ~50 personas y deja margen en el pooler de la capa gratuita.
const maxConns = 5

// Open crea el pool de conexiones. No conecta hasta la primera consulta, así que la
// API puede arrancar aunque la base esté dormida (health responderá 503 mientras tanto).
func Open(ctx context.Context, databaseURL string) (*Postgres, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("DATABASE_URL inválida: %w", err)
	}
	// El pooler de Supabase en modo transacción no admite sentencias preparadas
	// persistentes: se usa el protocolo simple (specs/00 §4). Consecuencia: los
	// parámetros viajan como texto; para columnas date conviene pasar
	// "YYYY-MM-DD" con cast explícito ($1::date).
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	cfg.MaxConns = maxConns

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &Postgres{pool: pool}, nil
}

// Close cierra el pool.
func (p *Postgres) Close() { p.pool.Close() }

// Ping ejecuta SELECT 1: una consulta real cuenta como actividad para Supabase.
func (p *Postgres) Ping(ctx context.Context) error {
	_, err := p.pool.Exec(ctx, "SELECT 1")
	return err
}
