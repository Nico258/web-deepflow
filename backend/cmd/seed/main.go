// Command seed crea retos de tipo daily_steps.
//
// El primer reto (oracion-7-dias, del 14 al 20 de noviembre de 2026) ya lo crea
// la migración 0002. Este comando sirve para los retos siguientes y para retos de
// prueba en local, p. ej. con starts_on en el pasado para probar el bloqueo
// diario y las rachas (specs/04 §4):
//
//	go run ./cmd/seed -slug prueba -starts-on 2026-11-10
//	go run ./cmd/seed -slug otro-reto -starts-on 2027-01-10 -total-days 5 -threshold 0.7
//
// Usa DATABASE_URL.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Meperd0wnas/API-deepflow/internal/config"
	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

// Mismo formato que el CHECK de challenges.slug en migrations/0001_init.sql.
var slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

type options struct {
	slug      string
	startsOn  string
	totalDays int
	threshold float64
}

func main() {
	var o options
	flag.StringVar(&o.slug, "slug", "", "slug del reto, p. ej. oracion-7-dias (obligatorio)")
	flag.StringVar(&o.startsOn, "starts-on", "", "fecha del día 1, YYYY-MM-DD en hora de Bogotá (obligatorio)")
	flag.IntVar(&o.totalDays, "total-days", 7, "duración del reto en días")
	flag.Float64Var(&o.threshold, "threshold", domain.DefaultGroupStreakThreshold,
		"fracción de inscritos que debe completar un día para que cuente en la racha del grupo (0 a 1)")
	flag.Parse()

	if err := run(o); err != nil {
		fmt.Fprintln(os.Stderr, "seed:", err)
		os.Exit(1)
	}
}

func run(o options) error {
	cfgJSON, err := validate(o)
	if err != nil {
		return err
	}
	if err := config.LoadDotEnv(".env"); err != nil {
		return err
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return errors.New("falta DATABASE_URL")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cc, err := pgx.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("DATABASE_URL inválida: %w", err)
	}
	cc.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	conn, err := pgx.ConnectConfig(ctx, cc)
	if err != nil {
		return err
	}
	defer conn.Close(context.Background())

	var id string
	err = conn.QueryRow(ctx,
		`INSERT INTO challenges (slug, kind, starts_on, config)
		 VALUES ($1, $2, $3::date, $4::jsonb) RETURNING id::text`,
		o.slug, domain.KindDailySteps, o.startsOn, cfgJSON,
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("crear reto: %w", err)
	}
	fmt.Printf("reto creado: %s (%s, desde %s, %d días, umbral %.0f %%)\n",
		id, o.slug, o.startsOn, o.totalDays, o.threshold*100)
	return nil
}

// validate revisa las opciones y devuelve el config del reto en JSON, validado
// con las mismas reglas que aplica la API al leerlo.
func validate(o options) (string, error) {
	if !slugPattern.MatchString(o.slug) {
		return "", fmt.Errorf("-slug inválido %q: minúsculas, números y guiones", o.slug)
	}
	if _, err := time.Parse(domain.DateLayout, o.startsOn); err != nil {
		return "", errors.New("-starts-on debe ser una fecha YYYY-MM-DD")
	}
	raw, err := json.Marshal(map[string]any{
		"total_days":             o.totalDays,
		"group_streak_threshold": o.threshold,
	})
	if err != nil {
		return "", err
	}
	if _, err := domain.ParseDailyStepsConfig(raw); err != nil {
		return "", err
	}
	return string(raw), nil
}
