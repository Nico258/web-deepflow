package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
)

const (
	testOrigin = "https://deepflow.example"
	testSlug   = "oracion-7-dias"
)

// testEnv es la API con un fake store que ya tiene el reto testSlug (del
// 2026-11-14, 7 días, umbral 60 %). El reloj empieza en el día 3 del reto.
type testEnv struct {
	api   http.Handler
	store *fakeStore
	clock *clock
}

func newTestEnv(limits Limits) *testEnv {
	c := &clock{}
	c.SetBogota("2026-11-16 10:00")
	st := newFakeStore()
	st.addChallenge(domain.Challenge{
		Slug: testSlug, Kind: domain.KindDailySteps,
		StartsOn: time.Date(2026, 11, 14, 0, 0, 0, 0, time.UTC), TotalDays: 7, GroupStreakThreshold: 0.6,
	})
	api := New(Deps{
		Store:          st,
		AllowedOrigins: []string{testOrigin},
		Limits:         limits,
		Now:            c.Now,
	})
	return &testEnv{api: api, store: st, clock: c}
}

func (e *testEnv) do(method, path, tok, body string) response {
	return do(e.api, method, path, tok, body)
}

// join registra a una persona y devuelve su token.
func (e *testEnv) join(t *testing.T, nickname string) string {
	t.Helper()
	res := e.do("POST", "/v1/join", "", fmt.Sprintf(`{"nickname":%q}`, nickname))
	if res.Code != http.StatusCreated {
		t.Fatalf("join %s = %d %s", nickname, res.Code, res.Body)
	}
	tok, _ := res.json(t)["token"].(string)
	return tok
}

type response struct {
	*httptest.ResponseRecorder
}

func (r response) json(t *testing.T) map[string]any {
	t.Helper()
	var v map[string]any
	if err := json.Unmarshal(r.Body.Bytes(), &v); err != nil {
		t.Fatalf("respuesta no es JSON: %q", r.Body.String())
	}
	return v
}

func (r response) errorCode(t *testing.T) string {
	t.Helper()
	e, _ := r.json(t)["error"].(map[string]any)
	code, _ := e["code"].(string)
	return code
}

func do(h http.Handler, method, path, tok, body string) response {
	var rd io.Reader
	if body != "" {
		rd = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, rd)
	if tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return response{rec}
}

// expect falla si la respuesta no tiene el estado (y, si se indica, el código de error) esperado.
func expect(t *testing.T, res response, status int, errCode string) {
	t.Helper()
	if res.Code != status {
		t.Fatalf("estado %d, se esperaba %d: %s", res.Code, status, res.Body)
	}
	if errCode != "" && res.errorCode(t) != errCode {
		t.Fatalf("código %q, se esperaba %q: %s", res.errorCode(t), errCode, res.Body)
	}
}

func TestHealth(t *testing.T) {
	env := newTestEnv(Limits{})

	if res := env.do("GET", "/v1/health", "", ""); res.Code != 200 || res.json(t)["status"] != "ok" {
		t.Fatalf("health = %d %s", res.Code, res.Body)
	}
	env.store.pingErr = errors.New("sin conexión")
	res := env.do("GET", "/v1/health", "", "")
	expect(t, res, 503, "unavailable")
	if strings.Contains(res.Body.String(), "sin conexión") {
		t.Fatal("health filtró el error interno")
	}
}

func TestJoinAndProfileLifecycle(t *testing.T) {
	env := newTestEnv(Limits{})

	res := env.do("POST", "/v1/join", "", `{"nickname":" Ana_G "}`)
	expect(t, res, 201, "")
	body := res.json(t)
	tok, _ := body["token"].(string)
	if tok == "" {
		t.Fatal("join no devolvió token")
	}
	user := body["user"].(map[string]any)
	if user["nickname"] != "ana_g" || user["show_on_wall"] != true || len(user) != 3 {
		t.Fatalf("perfil inesperado (solo id, nickname y show_on_wall): %v", user)
	}

	if res := env.do("GET", "/v1/me", tok, ""); res.Code != 200 || res.json(t)["nickname"] != "ana_g" {
		t.Fatalf("GET /v1/me = %d %s", res.Code, res.Body)
	}

	res = env.do("PATCH", "/v1/me", tok, `{"show_on_wall":false}`)
	if res.Code != 200 || res.json(t)["show_on_wall"] != false {
		t.Fatalf("PATCH /v1/me = %d %s", res.Code, res.Body)
	}
	expect(t, env.do("PATCH", "/v1/me", tok, `{}`), 400, "invalid_body")
	expect(t, env.do("PATCH", "/v1/me", tok, `{"nickname":"otro"}`), 400, "invalid_body")

	expect(t, env.do("DELETE", "/v1/me", tok, ""), 204, "")
	expect(t, env.do("GET", "/v1/me", tok, ""), 401, "unauthorized")

	// Borrar la cuenta libera el nickname.
	env.join(t, "ana_g")
}

func TestJoinErrors(t *testing.T) {
	env := newTestEnv(Limits{})
	env.join(t, "ana")

	cases := []struct {
		name, body string
		status     int
		errCode    string
	}{
		{"nickname usado (sin distinguir mayúsculas)", `{"nickname":"ANA"}`, 409, "nickname_taken"},
		{"muy corto", `{"nickname":"ab"}`, 400, "invalid_nickname"},
		{"muy largo (8)", `{"nickname":"abcdefgh"}`, 400, "invalid_nickname"},
		{"con tilde", `{"nickname":"josé"}`, 400, "invalid_nickname"},
		{"vulgar", `{"nickname":"put4"}`, 400, "nickname_not_allowed"},
		{"ya no se pide nombre", `{"nickname":"luis","display_name":"Luis"}`, 400, "invalid_body"},
		{"ya no hay código de invitación", `{"nickname":"luis","invite_code":"X"}`, 400, "invalid_body"},
		{"sin cuerpo", ``, 400, "invalid_body"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			expect(t, env.do("POST", "/v1/join", "", c.body), c.status, c.errCode)
		})
	}
	// La ruta vieja ya no existe.
	expect(t, env.do("POST", "/v1/groups/join", "", `{"nickname":"luis"}`), 404, "not_found")
}

func TestMemberRoutesRequireToken(t *testing.T) {
	env := newTestEnv(Limits{})
	for _, path := range []string{"/v1/me", "/v1/challenges/" + testSlug, "/v1/challenges/" + testSlug + "/wall"} {
		for _, tok := range []string{"", "token-que-no-existe"} {
			expect(t, env.do("GET", path, tok, ""), 401, "unauthorized")
		}
	}
	req := httptest.NewRequest("GET", "/v1/me", nil)
	req.Header.Set("Authorization", "Basic abc")
	rec := httptest.NewRecorder()
	env.api.ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("esquema Basic → %d, se esperaba 401", rec.Code)
	}
}

func TestCORS(t *testing.T) {
	env := newTestEnv(Limits{})
	preflight := func(origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("OPTIONS", "/v1/me", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Method", "PATCH")
		rec := httptest.NewRecorder()
		env.api.ServeHTTP(rec, req)
		return rec
	}

	rec := preflight(testOrigin)
	if rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Origin") != testOrigin ||
		!strings.Contains(rec.Header().Get("Access-Control-Allow-Headers"), "Authorization") {
		t.Fatalf("preflight permitido = %d %v", rec.Code, rec.Header())
	}
	if rec.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Fatal("no debe enviarse Allow-Credentials")
	}
	if rec := preflight("https://evil.example"); rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("origen no permitido recibió Allow-Origin")
	}
}

func TestBodyTooLarge(t *testing.T) {
	env := newTestEnv(Limits{})
	big := `{"nickname":"` + strings.Repeat("a", maxBodyBytes) + `"}`
	expect(t, env.do("POST", "/v1/join", "", big), 413, "body_too_large")
}

func TestRateLimit(t *testing.T) {
	one := Limit{Requests: 1, Per: time.Hour, Burst: 1}
	env := newTestEnv(Limits{PerIP: one, Join: one, PerUser: one})

	expect(t, env.do("GET", "/v1/health", "", ""), 200, "")
	res := env.do("GET", "/v1/health", "", "")
	expect(t, res, 429, "rate_limited")
	if res.Header().Get("Retry-After") == "" {
		t.Fatal("falta Retry-After")
	}
}

// El grupo entero se registra y marca el día 1 a la vez desde el wifi de la
// reunión (una sola IP): los límites por defecto deben dejarlo pasar.
func TestDefaultLimitsLetTheWholeMeetingIn(t *testing.T) {
	env := newTestEnv(Limits{})
	env.clock.SetBogota("2026-11-14 19:00")
	for i := range 55 {
		tok := env.join(t, fmt.Sprintf("p%03d", i))
		expect(t, env.do("GET", "/v1/challenges/"+testSlug, tok, ""), 200, "")
		expect(t, env.do("PUT", "/v1/challenges/"+testSlug+"/checkins/1", tok, `{"accepted_terms":true}`), 201, "")
	}
}

func TestUnknownRouteUsesErrorFormat(t *testing.T) {
	env := newTestEnv(Limits{})
	expect(t, env.do("GET", "/v1/nada", "", ""), 404, "not_found")
}

func TestEveryDomainErrorIsInCatalog(t *testing.T) {
	for _, e := range domain.AllErrors {
		if _, ok := catalog[e.Code]; !ok {
			t.Errorf("el código de dominio %q no tiene entrada en el catálogo de errores", e.Code)
		}
	}
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name string
		xff  []string
		hops int
		want string
	}{
		{"sin proxy ignora XFF", []string{"1.1.1.1"}, 0, "10.0.0.9"},
		{"un salto: última entrada", []string{"6.6.6.6, 1.1.1.1"}, 1, "1.1.1.1"},
		{"dos saltos", []string{"6.6.6.6, 1.1.1.1, 35.0.0.1"}, 2, "1.1.1.1"},
		{"varias cabeceras", []string{"6.6.6.6", "1.1.1.1"}, 1, "1.1.1.1"},
		{"faltan entradas: usa la conexión", nil, 1, "10.0.0.9"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = "10.0.0.9:5555"
			for _, v := range c.xff {
				req.Header.Add("X-Forwarded-For", v)
			}
			if got := clientIP(req, c.hops); got != c.want {
				t.Fatalf("clientIP = %s, se esperaba %s", got, c.want)
			}
		})
	}
}
