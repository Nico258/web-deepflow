// Package httpapi expone la API REST /v1 (specs/03).
//
// Tres capas: middleware (CORS con lista de orígenes, rate limit, token), handlers
// REST y lógica de dominio (paquete domain). Los handlers son delgados: validan la
// entrada, llaman a domain y a Store, y serializan.
package httpapi

import (
	"log/slog"
	"net/http"
	"time"
)

// maxBodyBytes es el tamaño máximo de un cuerpo de petición (specs/03 §5).
const maxBodyBytes = 4 << 10

// Deps son las dependencias de la API.
type Deps struct {
	Store            Store
	Log              *slog.Logger
	AllowedOrigins   []string
	TrustedProxyHops int
	Limits           Limits           // vacío = DefaultLimits
	Now              func() time.Time // nil = time.Now; los tests (y DEV_TODAY) fijan la hora
}

type server struct {
	store       Store
	log         *slog.Logger
	proxyHops   int
	now         func() time.Time
	userLimiter *rateLimiter
}

// New arma el enrutador con todas las rutas y el middleware.
func New(d Deps) http.Handler {
	if d.Limits == (Limits{}) {
		d.Limits = DefaultLimits
	}
	if d.Now == nil {
		d.Now = time.Now
	}
	if d.Log == nil {
		d.Log = slog.New(slog.DiscardHandler)
	}
	s := &server{
		store:       d.Store,
		log:         d.Log,
		proxyHops:   d.TrustedProxyHops,
		now:         d.Now,
		userLimiter: newRateLimiter(d.Limits.PerUser),
	}
	joinLimiter := newRateLimiter(d.Limits.Join)
	ipLimiter := newRateLimiter(d.Limits.PerIP)

	mux := http.NewServeMux()

	// Salud: la llama el cron de GitHub Actions para que Supabase no pause la base.
	mux.HandleFunc("GET /v1/health", s.handleHealth)

	// Identidad: entrada libre con solo un nickname.
	mux.Handle("POST /v1/join", s.limitByIP(joinLimiter, http.HandlerFunc(s.handleJoin)))
	mux.Handle("GET /v1/me", s.member(s.handleGetMe))
	mux.Handle("PATCH /v1/me", s.member(s.handlePatchMe))
	mux.Handle("DELETE /v1/me", s.member(s.handleDeleteMe))

	// Reto de 7 días. No hay ruta de inscripción: se crea con el primer check-in.
	mux.Handle("GET /v1/challenges/{slug}", s.member(s.handleGetChallenge))
	mux.Handle("GET /v1/challenges/{slug}/me", s.member(s.handleChallengeMe))
	mux.Handle("PUT /v1/challenges/{slug}/checkins/{day}", s.member(s.handlePutCheckin))
	mux.Handle("GET /v1/challenges/{slug}/wall", s.member(s.handleWall))
	mux.Handle("GET /v1/challenges/{slug}/river", s.member(s.handleRiver))

	// Posteriores (specs/03 §8), fuera del primer lanzamiento:
	//   POST /v1/challenges/{slug}/encouragements
	//   DELETE /v1/admin/users/{id}  (clave de administrador; hoy se borra en la base)
	// Las peticiones de oración son otra funcionalidad (specs/05): irán en un
	// módulo propio que solo comparte la identidad.

	// Cualquier otra ruta: 404 con el formato de error de la API.
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) { writeError(w, "not_found") })

	var h http.Handler = mux
	h = s.limitByIP(ipLimiter, h)
	h = limitBody(maxBodyBytes, h)
	h = cors(d.AllowedOrigins, h)
	h = logRequests(d.Log, h)
	h = recoverPanics(d.Log, h)
	return h
}
