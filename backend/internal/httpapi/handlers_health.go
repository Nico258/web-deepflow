package httpapi

import (
	"context"
	"net/http"
	"time"
)

// GET /v1/health — cualquiera.
//
// Ejecuta una consulta real para que Supabase no pause el proyecto por inactividad
// (specs/00 §4). No devuelve datos internos: solo ok o 503.
func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		s.log.Warn("health: la base de datos no responde", "err", err)
		writeError(w, "unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
