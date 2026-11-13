package httpapi

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"
)

// recoverPanics convierte un panic en un 500 con el formato de error, sin tumbar el servidor.
func recoverPanics(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				if v == http.ErrAbortHandler {
					panic(v)
				}
				log.Error("panic", "method", r.Method, "path", r.URL.Path, "panic", v, "stack", string(debug.Stack()))
				writeError(w, "internal")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// logRequests registra método, ruta, estado y duración.
//
// Nunca se registran cabeceras, query ni cuerpo: ahí viajan el token y el código
// de invitación (specs/03 §6).
func logRequests(log *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w}
		next.ServeHTTP(rec, r)
		if rec.status == 0 {
			rec.status = http.StatusOK
		}
		log.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	if r.status == 0 {
		r.status = code
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.ResponseWriter.Write(b)
}

func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// cors permite solo los orígenes de la lista (nunca "*"). Como la API usa
// Authorization: Bearer y no cookies, no hace falta Allow-Credentials (specs/03 §7).
//
// Va por fuera del rate limit para que las respuestas 429 también lleven las
// cabeceras CORS y el front pueda leerlas.
func cors(allowed []string, next http.Handler) http.Handler {
	origins := make(map[string]bool, len(allowed))
	for _, o := range allowed {
		origins[o] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Add("Vary", "Origin")
		origin := r.Header.Get("Origin")
		ok := origin != "" && origins[origin]
		if ok {
			h.Set("Access-Control-Allow-Origin", origin)
		}

		// Preflight: se responde aquí, sin pasar por el enrutador.
		if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
			if ok {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
				h.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				h.Set("Access-Control-Max-Age", "600")
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// limitBody corta los cuerpos que superan n bytes (decodeJSON responde 413).
func limitBody(n int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, n)
		next.ServeHTTP(w, r)
	})
}
