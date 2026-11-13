// Command api arranca la API HTTP de DeepFlow: lee la configuración, abre el pool
// de Postgres, arma las rutas y sirve hasta recibir SIGINT/SIGTERM.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Meperd0wnas/API-deepflow/internal/config"
	"github.com/Meperd0wnas/API-deepflow/internal/domain"
	"github.com/Meperd0wnas/API-deepflow/internal/httpapi"
	"github.com/Meperd0wnas/API-deepflow/internal/store"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("la API se detuvo", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	if err := config.LoadDotEnv(".env"); err != nil {
		return err
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()

	srv := &http.Server{
		Addr: ":" + cfg.Port,
		Handler: httpapi.New(httpapi.Deps{
			Store:            db,
			Log:              log,
			AllowedOrigins:   cfg.AllowedOrigins,
			TrustedProxyHops: cfg.TrustedProxyHops,
			Now:              clock(cfg, log),
		}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    8 << 10,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("API escuchando", "addr", srv.Addr, "cors_origins", cfg.AllowedOrigins)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
	}

	log.Info("apagando la API")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

// clock devuelve el reloj de la API. Con DEV_TODAY (solo con APP_ENV=development)
// corre desplazado para que «hoy» en Bogotá sea esa fecha: sirve para probar el
// bloqueo diario y las rachas sin esperar días reales (specs/04 §4).
func clock(cfg config.Config, log *slog.Logger) func() time.Time {
	if cfg.DevToday == nil {
		return time.Now
	}
	offset := domain.DaysBetween(domain.Today(time.Now()), *cfg.DevToday)
	log.Warn("DEV_TODAY activo: «hoy» está fijado para pruebas; nunca usar en producción",
		"today", cfg.DevToday.Format(domain.DateLayout))
	return func() time.Time { return time.Now().AddDate(0, 0, offset) }
}
