// Package config lee la configuración de la API desde variables de entorno.
//
// Los secretos (la cadena de conexión) viven solo en el entorno del hosting y en
// los secretos de GitHub, nunca en el repo (specs/00 §4).
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config es la configuración de la API.
type Config struct {
	// Port es el puerto HTTP. Cloud Run y Render lo inyectan en PORT.
	Port string

	// DatabaseURL apunta al pooler de Supabase (modo transacción) en producción
	// o al Postgres local en desarrollo.
	DatabaseURL string

	// AllowedOrigins es la lista de orígenes que CORS acepta. Nunca "*" (specs/03 §7).
	AllowedOrigins []string

	// TrustedProxyHops es cuántos proxies de confianza hay delante de la API.
	// 0 = usar la IP de la conexión (desarrollo local).
	// 1 = usar la última entrada de X-Forwarded-For (la que agrega el proxy del hosting).
	// Hay que verificarlo en el hosting real: ver specs/03 §5.
	TrustedProxyHops int

	// DevToday fija «hoy» (fecha de Bogotá) para probar el reto sin esperar días
	// reales. Solo se acepta con APP_ENV=development; nunca en producción (specs/04 §4).
	DevToday *time.Time
}

// Load lee y valida la configuración. Devuelve todos los problemas juntos.
func Load() (Config, error) {
	cfg := Config{
		Port:        getenv("PORT", "8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}

	var errs []error
	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("falta DATABASE_URL"))
	}

	origins, err := parseOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if err != nil {
		errs = append(errs, err)
	}
	cfg.AllowedOrigins = origins

	hops, err := strconv.Atoi(getenv("TRUSTED_PROXY_HOPS", "0"))
	if err != nil || hops < 0 {
		errs = append(errs, errors.New("TRUSTED_PROXY_HOPS debe ser un entero mayor o igual a 0"))
	}
	cfg.TrustedProxyHops = hops

	if raw := os.Getenv("DEV_TODAY"); raw != "" {
		switch day, err := time.Parse(time.DateOnly, raw); {
		case os.Getenv("APP_ENV") != "development":
			errs = append(errs, errors.New("DEV_TODAY solo se permite con APP_ENV=development"))
		case err != nil:
			errs = append(errs, errors.New("DEV_TODAY debe tener el formato YYYY-MM-DD"))
		default:
			cfg.DevToday = &day
		}
	}

	return cfg, errors.Join(errs...)
}

func parseOrigins(raw string) ([]string, error) {
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		o = strings.TrimSuffix(strings.TrimSpace(o), "/")
		if o == "" {
			continue
		}
		if o == "*" {
			return nil, errors.New("CORS_ALLOWED_ORIGINS no admite \"*\": lista los orígenes uno por uno")
		}
		if !strings.HasPrefix(o, "http://") && !strings.HasPrefix(o, "https://") {
			return nil, fmt.Errorf("origen CORS inválido %q: debe empezar por http:// o https://", o)
		}
		origins = append(origins, o)
	}
	return origins, nil
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
