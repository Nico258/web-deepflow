package httpapi

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

const challengePath = "/v1/challenges/" + testSlug

func checkinPath(day any) string { return fmt.Sprintf("%s/checkins/%v", challengePath, day) }

const firstDay = `{"wrote_note":false,"accepted_terms":true}`

func TestChallengeAndFirstCheckin(t *testing.T) {
	env := newTestEnv(Limits{}) // lunes 16: día 3 del reto
	ana := env.join(t, "ana")

	res := env.do("GET", challengePath, ana, "")
	expect(t, res, 200, "")
	c := res.json(t)
	want := map[string]any{
		"slug": testSlug, "kind": "daily_steps", "starts_on": "2026-11-14", "total_days": 7.0,
		"today": "2026-11-16", "day_number": 3.0, "status": "in_progress", "enrolled": false,
	}
	if !reflect.DeepEqual(c, want) {
		t.Fatalf("reto = %v\nse esperaba %v", c, want)
	}
	expect(t, env.do("GET", "/v1/challenges/no-existe", ana, ""), 404, "not_found")

	// Registrarse no inscribe: /me responde vacío, sin error.
	me := env.do("GET", challengePath+"/me", ana, "").json(t)
	if me["enrolled"] != false || me["joined_day"] != nil || len(me["checkins"].([]any)) != 0 ||
		me["completed_count"] != 0.0 || me["written_count"] != 0.0 || me["streak"] != 0.0 {
		t.Fatalf("avance antes del primer día = %v", me)
	}

	// El primer día exige aceptar el aviso de privacidad.
	expect(t, env.do("PUT", checkinPath(3), ana, `{"wrote_note":true}`), 400, "terms_not_accepted")
	expect(t, env.do("PUT", checkinPath(3), ana, `{"accepted_terms":false}`), 400, "terms_not_accepted")
	if env.do("GET", challengePath, ana, "").json(t)["enrolled"] != false {
		t.Fatal("un check-in rechazado no debe inscribir")
	}

	// Primer día: crea la inscripción. Después ya no se pide el aviso.
	steps := []struct {
		body      string
		status    int
		wroteNote bool
	}{
		{firstDay, 201, false},
		{`{"wrote_note":true}`, 200, true},
		{`{"wrote_note":false}`, 200, false}, // wrote_note toma el valor nuevo (specs/04 §4)
		{`{"wrote_note":true}`, 200, true},
	}
	for i, st := range steps {
		res := env.do("PUT", checkinPath(3), ana, st.body)
		expect(t, res, st.status, "")
		if b := res.json(t); b["day_number"] != 3.0 || b["wrote_note"] != st.wroteNote {
			t.Fatalf("paso %d: check-in inesperado %v", i+1, b)
		}
	}
	if env.do("GET", challengePath, ana, "").json(t)["enrolled"] != true {
		t.Fatal("el primer check-in debía inscribir")
	}

	// Solo se completa el día de hoy.
	expect(t, env.do("PUT", checkinPath(2), ana, `{}`), 409, "day_closed")
	expect(t, env.do("PUT", checkinPath(4), ana, `{}`), 409, "day_in_future")
	expect(t, env.do("PUT", checkinPath(8), ana, `{}`), 400, "invalid_day")
	expect(t, env.do("PUT", checkinPath("x"), ana, `{}`), 400, "invalid_day")
	expect(t, env.do("PUT", checkinPath(3), ana, ""), 400, "invalid_body")

	me = env.do("GET", challengePath+"/me", ana, "").json(t)
	if me["enrolled"] != true || me["joined_day"] != 3.0 || me["completed_count"] != 1.0 ||
		me["written_count"] != 1.0 || me["streak"] != 1.0 {
		t.Fatalf("avance = %v", me)
	}
	if got := fmt.Sprint(me["checkins"]); got != "[map[day_number:3 wrote_note:true]]" {
		t.Fatalf("checkins = %s", got)
	}
}

func TestDaysLockAtBogotaMidnight(t *testing.T) {
	env := newTestEnv(Limits{})
	ana := env.join(t, "ana")

	// Viernes 13: aún no empieza.
	env.clock.SetBogota("2026-11-13 20:00")
	c := env.do("GET", challengePath, ana, "").json(t)
	if c["status"] != "not_started" || c["day_number"] != 0.0 {
		t.Fatalf("antes de empezar: %v", c)
	}
	expect(t, env.do("PUT", checkinPath(1), ana, firstDay), 409, "challenge_not_started")

	// Sábado 14, en la reunión.
	env.clock.SetBogota("2026-11-14 00:00")
	expect(t, env.do("PUT", checkinPath(1), ana, firstDay), 201, "")
	env.clock.SetBogota("2026-11-14 23:59")
	expect(t, env.do("PUT", checkinPath(1), ana, `{"wrote_note":true}`), 200, "")

	// A medianoche el día 1 se bloquea y se abre el 2.
	env.clock.SetBogota("2026-11-15 00:00")
	expect(t, env.do("PUT", checkinPath(1), ana, `{}`), 409, "day_closed")
	expect(t, env.do("PUT", checkinPath(2), ana, `{}`), 201, "")

	// Viernes 20: último día.
	env.clock.SetBogota("2026-11-20 21:00")
	expect(t, env.do("PUT", checkinPath(7), ana, `{}`), 201, "")
	if s := env.do("GET", challengePath+"/me", ana, "").json(t)["streak"]; s != 1.0 {
		t.Fatalf("racha tras saltarse los días 3 a 6 = %v, se esperaba 1", s)
	}

	// Sábado 21: cerrado.
	env.clock.SetBogota("2026-11-21 08:00")
	c = env.do("GET", challengePath, ana, "").json(t)
	if c["status"] != "finished" || c["day_number"] != 8.0 {
		t.Fatalf("terminado: %v", c)
	}
	expect(t, env.do("PUT", checkinPath(7), ana, `{}`), 409, "challenge_closed")
}

func TestWallAndRiver(t *testing.T) {
	env := newTestEnv(Limits{})

	// Sábado 14, día 1: cuatro personas se registran en la reunión. Pedro no
	// completa ningún día, así que nunca queda inscrito. Sofía oculta su muro.
	env.clock.SetBogota("2026-11-14 19:00")
	ana, luis, sofia, pedro := env.join(t, "ana"), env.join(t, "luis"), env.join(t, "sofia"), env.join(t, "pedro")
	expect(t, env.do("PATCH", "/v1/me", sofia, `{"show_on_wall":false}`), 200, "")
	for _, tok := range []string{ana, luis, sofia} {
		expect(t, env.do("PUT", checkinPath(1), tok, firstDay), 201, "")
	}

	// Día 2: solo ana.
	env.clock.SetBogota("2026-11-15 20:00")
	expect(t, env.do("PUT", checkinPath(2), ana, `{}`), 201, "")

	// Día 3: luis y sofía; marta llega tarde y hace su primer día.
	env.clock.SetBogota("2026-11-16 09:00")
	expect(t, env.do("PUT", checkinPath(3), luis, `{}`), 201, "")
	expect(t, env.do("PUT", checkinPath(3), sofia, `{}`), 201, "")
	env.clock.SetBogota("2026-11-16 10:00")
	marta := env.join(t, "marta")
	expect(t, env.do("PUT", checkinPath(3), marta, firstDay), 201, "")

	env.clock.SetBogota("2026-11-16 10:30")

	type row struct {
		nickname          string
		completed, streak int
	}
	wall := func(query string) []row {
		res := env.do("GET", challengePath+"/wall"+query, pedro, "") // cualquier miembro ve el muro
		expect(t, res, 200, "")
		if strings.Contains(res.Body.String(), "user") {
			t.Fatalf("el muro no debe exponer ids de personas: %s", res.Body)
		}
		var out []row
		for _, m := range res.json(t)["members"].([]any) {
			m := m.(map[string]any)
			if m["last_activity_at"] == nil {
				t.Fatalf("un inscrito siempre tiene actividad: %v", m)
			}
			out = append(out, row{m["nickname"].(string), int(m["completed_count"].(float64)), int(m["streak"].(float64))})
		}
		return out
	}

	// Solo inscritos con el muro visible: ni pedro (nunca completó un día) ni sofía.
	// Rachas: ana hizo 1 y 2 (hoy aún no) → 2; luis hizo 1 y 3 → 1; marta, 3 → 1.
	want := []row{{"marta", 1, 1}, {"luis", 2, 1}, {"ana", 2, 2}}
	if got := wall(""); !reflect.DeepEqual(got, want) {
		t.Fatalf("muro reciente = %v, se esperaba %v", got, want)
	}
	want = []row{{"ana", 2, 2}, {"luis", 2, 1}, {"marta", 1, 1}}
	if got := wall("?order=alpha"); !reflect.DeepEqual(got, want) {
		t.Fatalf("muro alfabético = %v, se esperaba %v", got, want)
	}
	expect(t, env.do("GET", challengePath+"/wall?order=puntaje", ana, ""), 400, "invalid_query")

	// Río: hechos 2 (ana) + 2 (luis) + 2 (sofía) + 1 (marta) = 7.
	// Posibles: ana, luis y sofía desde el día 1 (3 cada una) + marta desde el 3 (1) = 10.
	// Racha del grupo (60 % de los inscritos hasta ese día):
	//   día 1: 3 de 3 ✓ · día 2: 1 de 3 ✗ · día 3: 3 de 4 = 75 % ✓ → 1.
	river := env.do("GET", challengePath+"/river", ana, "").json(t)
	if river["total_checkins"] != 7.0 || river["possible_checkins"] != 10.0 || river["group_streak"] != 1.0 {
		t.Fatalf("río inesperado: %v", river)
	}

	// Borrar la cuenta la saca del muro y del río.
	expect(t, env.do("DELETE", "/v1/me", luis, ""), 204, "")
	if got := wall("?order=alpha"); len(got) != 2 || got[0].nickname != "ana" || got[1].nickname != "marta" {
		t.Fatalf("muro tras borrar a luis = %v", got)
	}
	river = env.do("GET", challengePath+"/river", ana, "").json(t)
	if river["total_checkins"] != 5.0 || river["possible_checkins"] != 7.0 {
		t.Fatalf("río tras borrar a luis: %v", river)
	}
}
