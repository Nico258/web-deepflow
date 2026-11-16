package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// writeJSON serializa v con el estado dado.
func writeJSON(w http.ResponseWriter, status int, v any) {
	h := w.Header()
	h.Set("Content-Type", "application/json; charset=utf-8")
	h.Set("Cache-Control", "no-store") // las respuestas pueden llevar el token o el perfil
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError responde con el formato único de error:
//
//	{ "error": { "code": "day_in_future", "message": "Ese día todavía no se abre." } }
func writeError(w http.ResponseWriter, code string) {
	e, ok := catalog[code]
	if !ok {
		code, e = "internal", catalog["internal"]
	}
	writeJSON(w, e.status, errorBody{Error: errorDetail{Code: code, Message: e.message}})
}

// fail responde a partir de un error: los de dominio con su código; cualquier otro
// como 500, registrándolo sin datos de la petición. Al cliente nunca le llegan
// detalles internos (consultas, trazas).
func (s *server) fail(w http.ResponseWriter, r *http.Request, err error) {
	var de *domain.Error
	if errors.As(err, &de) {
		writeError(w, de.Code)
		return
	}
	s.log.Error("error interno", "method", r.Method, "pattern", r.Pattern, "err", err)
	writeError(w, "internal")
}

// decodeJSON lee un único objeto JSON del cuerpo hacia dst y rechaza campos
// desconocidos. Si falla, ya respondió y devuelve false.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	err := dec.Decode(dst)
	if err == nil {
		// No debe haber nada después del objeto.
		if extra := dec.Decode(&struct{}{}); !errors.Is(extra, io.EOF) {
			err = extra
			if err == nil {
				err = errors.New("contenido extra después del JSON")
			}
		}
	}
	if err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, "body_too_large")
		} else {
			writeError(w, "invalid_body")
		}
		return false
	}
	return true
}
