package httpapi

import (
	"net/http"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

type profileResponse struct {
	ID         string `json:"id"`
	Nickname   string `json:"nickname"`
	ShowOnWall bool   `json:"show_on_wall"`
}

func toProfile(u domain.User) profileResponse {
	return profileResponse{ID: u.ID, Nickname: u.Nickname, ShowOnWall: u.ShowOnWall}
}

type patchMeRequest struct {
	ShowOnWall *bool `json:"show_on_wall"`
}

// GET /v1/me — miembro. Perfil propio.
func (s *server) handleGetMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, toProfile(currentUser(r)))
}

// PATCH /v1/me — miembro. Cambiar si aparece en el muro.
func (s *server) handlePatchMe(w http.ResponseWriter, r *http.Request) {
	var req patchMeRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.ShowOnWall == nil {
		writeError(w, "invalid_body")
		return
	}
	u, err := s.store.SetShowOnWall(r.Context(), currentUser(r).ID, *req.ShowOnWall)
	if err != nil {
		s.fail(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, toProfile(u))
}

// DELETE /v1/me — miembro. Borra la cuenta y, en cascada, inscripciones y
// check-ins; el nickname queda libre (specs/00 §3).
func (s *server) handleDeleteMe(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteUser(r.Context(), currentUser(r).ID); err != nil {
		s.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
