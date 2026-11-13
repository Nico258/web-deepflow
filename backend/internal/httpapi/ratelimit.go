package httpapi

import (
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// Limit es un límite de tasa tipo token bucket: Requests por cada Per, con ráfagas de hasta Burst.
type Limit struct {
	Requests int
	Per      time.Duration
	Burst    int
}

// Limits agrupa los límites de la API (specs/03 §5). Las cifras son un punto de partida.
type Limits struct {
	PerIP   Limit // todas las rutas
	Join    Limit // POST /v1/join, además del general
	PerUser Limit // rutas con token, además del general
}

// DefaultLimits son los límites por defecto.
//
// Pensados para la reunión del sábado: todo el grupo (~50 personas) se registra y
// marca el día 1 a la vez desde el mismo wifi, es decir, desde la misma IP.
var DefaultLimits = Limits{
	// General por IP. Generoso: 50 personas tras una IP, cada una con join, reto,
	// check-in y el polling del muro y el río.
	PerIP: Limit{Requests: 600, Per: time.Minute, Burst: 200},
	// Registro: sin código de invitación, es la principal defensa contra registros
	// masivos. La ráfaga deja pasar a todo el grupo presente; después, uno por minuto.
	Join: Limit{Requests: 60, Per: time.Hour, Burst: 60},
	// Por persona, para que una sola no agote el cupo de la IP compartida.
	PerUser: Limit{Requests: 60, Per: time.Minute, Burst: 30},
}

// rateLimiter lleva un token bucket por clave (IP o usuario), en memoria.
//
// Es por instancia: con varias instancias (Cloud Run) hay que limitar max-instances
// para que siga siendo útil (specs/00 §5).
type rateLimiter struct {
	mu        sync.Mutex
	limit     rate.Limit
	burst     int
	ttl       time.Duration // tras este tiempo sin uso, el bucket estaría lleno: se puede olvidar
	visitors  map[string]*visitor
	lastSweep time.Time
}

type visitor struct {
	lim  *rate.Limiter
	seen time.Time
}

func newRateLimiter(l Limit) *rateLimiter {
	perSecond := float64(l.Requests) / l.Per.Seconds()
	refill := time.Duration(float64(l.Burst) / perSecond * float64(time.Second))
	return &rateLimiter{
		limit:    rate.Limit(perSecond),
		burst:    l.Burst,
		ttl:      max(refill, time.Minute),
		visitors: make(map[string]*visitor),
	}
}

// allow consume una petición de key. Si no hay cupo, devuelve cuánto esperar.
func (rl *rateLimiter) allow(key string, now time.Time) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	if now.Sub(rl.lastSweep) > rl.ttl {
		for k, v := range rl.visitors {
			if now.Sub(v.seen) > rl.ttl {
				delete(rl.visitors, k)
			}
		}
		rl.lastSweep = now
	}

	v, ok := rl.visitors[key]
	if !ok {
		v = &visitor{lim: rate.NewLimiter(rl.limit, rl.burst)}
		rl.visitors[key] = v
	}
	v.seen = now

	res := v.lim.ReserveN(now, 1)
	if !res.OK() {
		return false, rl.ttl
	}
	if wait := res.DelayFrom(now); wait > 0 {
		res.CancelAt(now)
		return false, wait
	}
	return true, 0
}

func (s *server) limitByIP(rl *rateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if ok, wait := rl.allow(clientIP(r, s.proxyHops), s.now()); !ok {
			tooManyRequests(w, wait)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// tooManyRequests responde 429 con Retry-After en segundos.
func tooManyRequests(w http.ResponseWriter, wait time.Duration) {
	secs := max(1, int(math.Ceil(wait.Seconds())))
	w.Header().Set("Retry-After", strconv.Itoa(secs))
	writeError(w, "rate_limited")
}

// clientIP devuelve la IP de quien llama.
//
// Detrás del proxy de Cloud Run o Render la IP real viene en X-Forwarded-For.
// Solo se confía en las entradas que agregaron nuestros proxies (las últimas
// `hops`), porque las anteriores las puede escribir el propio cliente (specs/03 §5).
func clientIP(r *http.Request, hops int) string {
	if hops > 0 {
		var parts []string
		for _, h := range r.Header.Values("X-Forwarded-For") {
			for _, p := range strings.Split(h, ",") {
				if p = strings.TrimSpace(p); p != "" {
					parts = append(parts, p)
				}
			}
		}
		if len(parts) >= hops {
			return parts[len(parts)-hops]
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
