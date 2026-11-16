package httpapi

import (
	"net/http"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
	"github.com/Meperd0wnas/API-deepflow/internal/token"
)

type joinRequest struct {
	Nickname string `json:"nickname"`
}

type joinResponse struct {
	Token string          `json:"token"`
	User  profileResponse `json:"user"`
}

// POST /v1/join — cualquiera, con rate limit estricto.
//
// Registra a una persona con solo un nickname: es la «firma» del compromiso
// (specs/02 §8). Entrada libre, sin código de invitación ni contraseña. Devuelve
// el token una sola vez. Si el nickname ya existe responde 409 (opción A de
// specs/00 §3): así nadie entra en la cuenta de otra persona.
func (s *server) handleJoin(w http.ResponseWriter, r *http.Request) {
	var req joinRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	nickname, err := domain.NormalizeNickname(req.Nickname)
	if err != nil {
		s.fail(w, r, err) // invalid_nickname o nickname_not_allowed
		return
	}

	tok := token.New()
	u, err := s.store.CreateUser(r.Context(), domain.NewUser{Nickname: nickname, TokenHash: token.Hash(tok)})
	if err != nil {
		s.fail(w, r, err) // domain.ErrNicknameTaken → 409
		return
	}
	writeJSON(w, http.StatusCreated, joinResponse{Token: tok, User: toProfile(u)})
}
