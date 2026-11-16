package store

// Tests de integración contra un Postgres real. Se omiten si no está definida
// TEST_DATABASE_URL. Cada test crea su propio esquema (test_<n>), aplica las
// migraciones ahí y lo borra al final: no toca el esquema public.
//
//	$env:TEST_DATABASE_URL = "postgres://deepflow:deepflow@localhost:5432/deepflow?sslmode=disable"
//	go test ./internal/store/

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"reflect"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Meperd0wnas/API-deepflow/internal/domain"
	"github.com/Meperd0wnas/API-deepflow/internal/token"
	"github.com/Meperd0wnas/API-deepflow/migrations"
)

const noSuchID = "00000000-0000-0000-0000-000000000000"

func setup(t *testing.T) *Postgres {
	t.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("TEST_DATABASE_URL no definida: se omiten los tests de integración con Postgres")
	}
	ctx := context.Background()

	schema := fmt.Sprintf("test_%d", time.Now().UnixNano())
	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("conectar a TEST_DATABASE_URL: %v", err)
	}
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = admin.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE")
		_ = admin.Close(context.Background())
	})

	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("TEST_DATABASE_URL debe ser una URL postgres://…: %v", err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	dsn := u.String()

	db, err := migrations.Open(dsn)
	if err != nil {
		t.Fatal(err)
	}
	provider, err := migrations.NewProvider(db)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := provider.Up(ctx); err != nil {
		t.Fatalf("migrar: %v", err)
	}
	_ = db.Close()

	st, err := Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(st.Close)
	return st
}

func execErr(st *Postgres, sql string, args ...any) error {
	_, err := st.pool.Exec(context.Background(), sql, args...)
	return err
}

func mustExec(t *testing.T, st *Postgres, sql string, args ...any) {
	t.Helper()
	if err := execErr(st, sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func createUser(t *testing.T, st *Postgres, nickname string) domain.User {
	t.Helper()
	u, err := st.CreateUser(context.Background(), domain.NewUser{Nickname: nickname, TokenHash: token.Hash("tok-" + nickname)})
	if err != nil {
		t.Fatalf("CreateUser(%s): %v", nickname, err)
	}
	return u
}

func day(s string) time.Time {
	t, err := time.Parse(domain.DateLayout, s)
	if err != nil {
		panic(err)
	}
	return t
}

// at devuelve un instante en hora de Bogotá, p. ej. "2026-11-14 19:00".
func at(s string) time.Time {
	t, err := time.ParseInLocation("2006-01-02 15:04", s, domain.Bogota)
	if err != nil {
		panic(err)
	}
	return t
}

func TestUsers(t *testing.T) {
	st := setup(t)
	ctx := context.Background()

	if err := st.Ping(ctx); err != nil {
		t.Fatalf("Ping: %v", err)
	}

	ana := createUser(t, st, "ana")
	if ana.ID == "" || ana.Nickname != "ana" || !ana.ShowOnWall {
		t.Fatalf("usuario creado = %+v", ana)
	}
	_, err := st.CreateUser(ctx, domain.NewUser{Nickname: "ana", TokenHash: token.Hash("otro")})
	if !errors.Is(err, domain.ErrNicknameTaken) {
		t.Fatalf("nickname repetido = %v, se esperaba ErrNicknameTaken", err)
	}

	if got, err := st.UserByTokenHash(ctx, token.Hash("tok-ana")); err != nil || got != ana {
		t.Fatalf("UserByTokenHash = %+v, %v", got, err)
	}
	if _, err := st.UserByTokenHash(ctx, token.Hash("no-existe")); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("token inexistente = %v", err)
	}

	if got, err := st.SetShowOnWall(ctx, ana.ID, false); err != nil || got.ShowOnWall {
		t.Fatalf("SetShowOnWall = %+v, %v", got, err)
	}
	if _, err := st.SetShowOnWall(ctx, noSuchID, true); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("SetShowOnWall de alguien que no existe = %v", err)
	}

	// Borrar la cuenta libera el nickname.
	if err := st.DeleteUser(ctx, ana.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := st.UserByTokenHash(ctx, token.Hash("tok-ana")); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("tras borrar = %v", err)
	}
	createUser(t, st, "ana")
}

// La base es la red de seguridad de las reglas: los CHECK rechazan lo que la API
// nunca debería mandar.
func TestSchemaConstraints(t *testing.T) {
	st := setup(t)
	hash := token.Hash("x")

	rejected := map[string]struct {
		sql  string
		args []any
	}{
		"nickname de 8":           {`INSERT INTO users (nickname, token_hash) VALUES ('abcdefgh', $1)`, []any{hash}},
		"nickname con mayúsculas": {`INSERT INTO users (nickname, token_hash) VALUES ('Ana', $1)`, []any{hash}},
		"hash que no es SHA-256":  {`INSERT INTO users (nickname, token_hash) VALUES ('ana', $1)`, []any{[]byte("corto")}},
		"daily_steps sin fecha":   {`INSERT INTO challenges (slug, kind, config) VALUES ('a', 'daily_steps', '{"total_days":7}')`, nil},
		"daily_steps sin días":    {`INSERT INTO challenges (slug, kind, starts_on) VALUES ('b', 'daily_steps', '2026-11-14')`, nil},
		"total_days decimal":      {`INSERT INTO challenges (slug, kind, starts_on, config) VALUES ('c', 'daily_steps', '2026-11-14', '{"total_days":7.5}')`, nil},
		"total_days como texto":   {`INSERT INTO challenges (slug, kind, starts_on, config) VALUES ('d', 'daily_steps', '2026-11-14', '{"total_days":"7"}')`, nil},
		"slug repetido":           {`INSERT INTO challenges (slug, kind, starts_on, config) VALUES ('oracion-7-dias', 'daily_steps', '2026-11-14', '{"total_days":7}')`, nil},
	}
	for name, r := range rejected {
		if err := execErr(st, r.sql, r.args...); err == nil {
			t.Errorf("%s: la base debía rechazarlo", name)
		}
	}
	// Otro tipo de reto no exige starts_on ni total_days.
	mustExec(t, st, `INSERT INTO challenges (slug, kind) VALUES ('quiz-1', 'quiz')`)
}

func TestFirstChallengeIsSeeded(t *testing.T) {
	st := setup(t)
	c, err := st.ChallengeBySlug(context.Background(), "oracion-7-dias")
	if err != nil {
		t.Fatal(err)
	}
	if c.Kind != domain.KindDailySteps || !c.StartsOn.Equal(day("2026-11-14")) || c.TotalDays != 7 || c.GroupStreakThreshold != 0.6 {
		t.Fatalf("primer reto = %+v", c)
	}
	if c.DateOfDay(7).Format(domain.DateLayout) != "2026-11-20" {
		t.Fatal("el día 7 debía ser el viernes 20")
	}
	if _, err := st.ChallengeBySlug(context.Background(), "no-existe"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("reto inexistente = %v", err)
	}
	// Un reto de un tipo que la API no conoce es un error de datos, no un 404.
	mustExec(t, st, `INSERT INTO challenges (slug, kind) VALUES ('quiz-1', 'quiz')`)
	if _, err := st.ChallengeBySlug(context.Background(), "quiz-1"); err == nil || !strings.Contains(err.Error(), "no soportado") {
		t.Fatalf("reto de tipo desconocido = %v", err)
	}
}

func TestCheckinsAndAggregates(t *testing.T) {
	st := setup(t)
	ctx := context.Background()

	c, err := st.ChallengeBySlug(ctx, "oracion-7-dias")
	if err != nil {
		t.Fatal(err)
	}
	ana, luis := createUser(t, st, "ana"), createUser(t, st, "luis")
	if _, err := st.SetShowOnWall(ctx, luis.ID, false); err != nil {
		t.Fatal(err)
	}

	if _, found, err := st.Enrollment(ctx, ana.ID, c.ID); err != nil || found {
		t.Fatalf("antes del primer día: found=%v err=%v", found, err)
	}

	checkin := func(u domain.User, d int, wrote bool, when string) (domain.Checkin, bool) {
		t.Helper()
		ck, created, err := st.RecordCheckin(ctx, domain.NewCheckin{
			UserID: u.ID, ChallengeID: c.ID, Day: d,
			CompletedOn: domain.Today(at(when)), WroteNote: wrote, At: at(when),
		})
		if err != nil {
			t.Fatalf("RecordCheckin(%s, día %d): %v", u.Nickname, d, err)
		}
		return ck, created
	}

	// El primer check-in crea la inscripción con joined_at = el instante del registro.
	// 19:30 del sábado en Bogotá son las 00:30 UTC del domingo: la fecha debe ser la de Bogotá.
	ck, created := checkin(ana, 1, false, "2026-11-14 19:30")
	if !created || ck.DayNumber != 1 || ck.WroteNote || !ck.CompletedOn.Equal(day("2026-11-14")) {
		t.Fatalf("primer check-in = %+v created=%v", ck, created)
	}
	e, found, err := st.Enrollment(ctx, ana.ID, c.ID)
	if err != nil || !found || !e.JoinedOn.Equal(day("2026-11-14")) {
		t.Fatalf("inscripción implícita = %+v found=%v err=%v", e, found, err)
	}

	// Repetir no duplica y wrote_note toma el valor nuevo.
	for _, wrote := range []bool{true, false} {
		ck, created = checkin(ana, 1, wrote, "2026-11-14 21:00")
		if created || ck.WroteNote != wrote {
			t.Fatalf("repetir con wrote_note=%v → %+v created=%v", wrote, ck, created)
		}
	}
	checkin(ana, 2, true, "2026-11-15 08:00")
	checkin(luis, 3, false, "2026-11-16 09:00") // luis llega el día 3

	var enrollments int
	if err := st.pool.QueryRow(ctx, `SELECT count(*) FROM enrollments`).Scan(&enrollments); err != nil || enrollments != 2 {
		t.Fatalf("inscripciones = %d (%v), se esperaban 2", enrollments, err)
	}

	checkins, err := st.Checkins(ctx, e.ID)
	if err != nil {
		t.Fatal(err)
	}
	want := []domain.Checkin{
		{DayNumber: 1, WroteNote: false, CompletedOn: day("2026-11-14")},
		{DayNumber: 2, WroteNote: true, CompletedOn: day("2026-11-15")},
	}
	if !reflect.DeepEqual(checkins, want) {
		t.Fatalf("Checkins = %+v", checkins)
	}

	activity, err := st.ActivityDays(ctx, []string{ana.ID, luis.ID})
	if err != nil {
		t.Fatal(err)
	}
	got := activity[ana.ID]
	slices.SortFunc(got, func(a, b time.Time) int { return a.Compare(b) })
	if !reflect.DeepEqual(got, []time.Time{day("2026-11-14"), day("2026-11-15")}) ||
		!reflect.DeepEqual(activity[luis.ID], []time.Time{day("2026-11-16")}) {
		t.Fatalf("ActivityDays = %v", activity)
	}
	if empty, err := st.ActivityDays(ctx, nil); err != nil || len(empty) != 0 {
		t.Fatalf("ActivityDays(nil) = %v, %v", empty, err)
	}

	// Muro: solo inscritos con show_on_wall (luis lo ocultó).
	wall, err := st.WallMembers(ctx, c.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(wall) != 1 || wall[0].UserID != ana.ID || wall[0].CompletedCount != 2 ||
		wall[0].LastActivityAt == nil || !wall[0].LastActivityAt.Equal(at("2026-11-15 08:00")) {
		t.Fatalf("WallMembers = %+v", wall)
	}

	// Río: todas las inscripciones, con su día de inscripción en Bogotá.
	acts, err := st.ChallengeActivity(ctx, c.ID)
	if err != nil {
		t.Fatal(err)
	}
	slices.SortFunc(acts, func(a, b domain.EnrollmentActivity) int { return a.JoinedOn.Compare(b.JoinedOn) })
	if len(acts) != 2 ||
		!acts[0].JoinedOn.Equal(day("2026-11-14")) || !reflect.DeepEqual(acts[0].Days, []int{1, 2}) ||
		!acts[1].JoinedOn.Equal(day("2026-11-16")) || !reflect.DeepEqual(acts[1].Days, []int{3}) {
		t.Fatalf("ChallengeActivity = %+v", acts)
	}

	// Un reto con inscripciones no se puede borrar por accidente.
	if err := execErr(st, `DELETE FROM challenges WHERE id = $1`, c.ID); err == nil {
		t.Fatal("borrar un reto con inscripciones debía fallar (ON DELETE RESTRICT)")
	}

	// Borrar la cuenta borra en cascada inscripciones y check-ins.
	if err := st.DeleteUser(ctx, ana.ID); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := st.pool.QueryRow(ctx, `SELECT count(*) FROM checkins`).Scan(&left); err != nil || left != 1 {
		t.Fatalf("quedan %d check-ins (%v), se esperaba solo el de luis", left, err)
	}
}
