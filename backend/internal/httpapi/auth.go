package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
	"github.com/Meperd0wnas/API-deepflow/internal/token"
)

type userCtxKey struct{}

// currentUser devuelve la persona autenticada. Solo es válido dentro de handlers
// envueltos con member().
func currentUser(r *http.Request) domain.User {
	u, _ := r.Context().Value(userCtxKey{}).(domain.User)
	return u
}

// member exige un token de dispositivo válido (specs/03 §2): hashea el token
// recibido, busca a la persona y la pone en el contexto. Sin coincidencia → 401.
// Además aplica el límite por persona.
func (s *server) member(h http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok, ok := bearerToken(r)
		if !ok {
			writeError(w, "unauthorized")
			return
		}
		u, err := s.store.UserByTokenHash(r.Context(), token.Hash(tok))
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, "unauthorized")
			return
		}
		if err != nil {
			s.fail(w, r, err)
			return
		}
		if ok, wait := s.userLimiter.allow(u.ID, s.now()); !ok {
			tooManyRequests(w, wait)
			return
		}
		h(w, r.WithContext(context.WithValue(r.Context(), userCtxKey{}, u)))
	})
}

// bearerToken extrae el token de «Authorization: Bearer <token>». Nunca se acepta
// en la URL ni en la query.
func bearerToken(r *http.Request) (string, bool) {
	scheme, tok, ok := strings.Cut(r.Header.Get("Authorization"), " ")
	if !ok || !strings.EqualFold(scheme, "Bearer") {
		return "", false
	}
	tok = strings.TrimSpace(tok)
	return tok, tok != ""
}
