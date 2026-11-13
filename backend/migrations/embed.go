// Package migrations incrusta los archivos SQL en el binario, para que cmd/migrate
// no dependa del directorio desde el que se ejecute.
//
// Reglas (specs/04 §6): un archivo numerado por cambio (0001_init.sql, 0002_….sql);
// nunca se edita uno ya aplicado, se agrega uno nuevo. Formato de goose: cada
// archivo tiene una sección «-- +goose Up» y otra «-- +goose Down».
package migrations

import (
	"database/sql"
	"embed"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed *.sql
var FS embed.FS

// Open abre la base para migrar. Usa el protocolo simple para funcionar también a
// través de un pooler en modo transacción, aunque para migraciones se recomienda
// el modo sesión.
func Open(dsn string) (*sql.DB, error) {
	cc, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("cadena de conexión inválida: %w", err)
	}
	cc.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	return stdlib.OpenDB(*cc), nil
}

// NewProvider crea el proveedor de goose con las migraciones incrustadas.
func NewProvider(db *sql.DB) (*goose.Provider, error) {
	return goose.NewProvider(goose.DialectPostgres, db, FS)
}
