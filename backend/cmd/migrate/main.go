// Command migrate aplica las migraciones de migrations/ con goose.
//
//	go run ./cmd/migrate           # aplica las pendientes (= up)
//	go run ./cmd/migrate status    # lista aplicadas y pendientes
//	go run ./cmd/migrate down      # revierte la última
//
// Usa MIGRATIONS_DATABASE_URL si está definida (en Supabase: el pooler en modo
// sesión) y si no DATABASE_URL.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path"
	"time"

	"github.com/pressly/goose/v3"

	"github.com/Meperd0wnas/API-deepflow/internal/config"
	"github.com/Meperd0wnas/API-deepflow/migrations"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "migrate:", err)
		os.Exit(1)
	}
}

func run() error {
	if err := config.LoadDotEnv(".env"); err != nil {
		return err
	}
	dsn := os.Getenv("MIGRATIONS_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		return errors.New("falta MIGRATIONS_DATABASE_URL o DATABASE_URL")
	}
	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	db, err := migrations.Open(dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	provider, err := migrations.NewProvider(db)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	switch cmd {
	case "up":
		results, err := provider.Up(ctx)
		for _, r := range results {
			fmt.Println(r)
		}
		if err == nil && len(results) == 0 {
			fmt.Println("no hay migraciones pendientes")
		}
		return err
	case "down":
		result, err := provider.Down(ctx)
		if result != nil {
			fmt.Println(result)
		}
		return err
	case "status":
		statuses, err := provider.Status(ctx)
		if err != nil {
			return err
		}
		for _, s := range statuses {
			state := "pendiente"
			if s.State == goose.StateApplied {
				state = "aplicada " + s.AppliedAt.Format(time.RFC3339)
			}
			fmt.Printf("%-28s %s\n", path.Base(s.Source.Path), state)
		}
		return nil
	default:
		return fmt.Errorf("comando desconocido %q: usa up, down o status", cmd)
	}
}
