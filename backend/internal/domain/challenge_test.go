package domain

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func date(s string) time.Time {
	t, err := time.Parse(DateLayout, s)
	if err != nil {
		panic(err)
	}
	return t
}

// firstEdition es la primera edición: del sábado 14 al viernes 20 de noviembre de 2026.
var firstEdition = Challenge{Slug: "oracion-7-dias", Kind: KindDailySteps, StartsOn: date("2026-11-14"), TotalDays: 7, GroupStreakThreshold: 0.6}

func TestTodayUsesBogotaMidnight(t *testing.T) {
	// Bogotá es UTC−5 todo el año (sin horario de verano).
	cases := []struct {
		now  string
		want string
	}{
		{"2026-11-15T04:59:59Z", "2026-11-14"}, // 23:59:59 del sábado en Bogotá
		{"2026-11-15T05:00:00Z", "2026-11-15"}, // medianoche en Bogotá
		{"2026-11-15T23:00:00Z", "2026-11-15"},
	}
	for _, c := range cases {
		now, _ := time.Parse(time.RFC3339, c.now)
		if got := Today(now).Format(DateLayout); got != c.want {
			t.Errorf("Today(%s) = %s, se esperaba %s", c.now, got, c.want)
		}
	}
}

func TestDayNumberAndStatus(t *testing.T) {
	cases := []struct {
		today  string
		day    int
		status ChallengeStatus
	}{
		{"2026-11-13", 0, ChallengeNotStarted},
		{"2026-11-14", 1, ChallengeInProgress},
		{"2026-11-20", 7, ChallengeInProgress},
		{"2026-11-21", 8, ChallengeFinished},
	}
	for _, tc := range cases {
		today := date(tc.today)
		if got := firstEdition.DayNumber(today); got != tc.day {
			t.Errorf("DayNumber(%s) = %d, se esperaba %d", tc.today, got, tc.day)
		}
		if got := firstEdition.Status(today); got != tc.status {
			t.Errorf("Status(%s) = %s, se esperaba %s", tc.today, got, tc.status)
		}
	}
}

func TestValidateCheckinOnlyToday(t *testing.T) {
	cases := []struct {
		name  string
		today string
		day   int
		want  error
	}{
		{"hoy", "2026-11-16", 3, nil},
		{"ayer ya se cerró", "2026-11-16", 2, ErrDayClosed},
		{"mañana", "2026-11-16", 4, ErrDayInFuture},
		{"día 0", "2026-11-16", 0, ErrInvalidDay},
		{"día 8", "2026-11-16", 8, ErrInvalidDay},
		{"antes de empezar", "2026-11-13", 1, ErrChallengeNotStarted},
		{"primer día", "2026-11-14", 1, nil},
		{"último día", "2026-11-20", 7, nil},
		{"el día 7 durante el día 8", "2026-11-21", 7, ErrChallengeClosed},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := firstEdition.ValidateCheckin(tc.day, date(tc.today))
			if !errors.Is(err, tc.want) {
				t.Fatalf("ValidateCheckin(%d, %s) = %v, se esperaba %v", tc.day, tc.today, err, tc.want)
			}
		})
	}
}

func TestDateOfDay(t *testing.T) {
	c := Challenge{StartsOn: date("2026-11-30"), TotalDays: 7}
	if got := c.DateOfDay(3).Format(DateLayout); got != "2026-12-02" {
		t.Fatalf("DateOfDay(3) = %s, se esperaba 2026-12-02", got)
	}
}

func TestBuildChallenge(t *testing.T) {
	starts := date("2026-11-14")
	c, err := BuildChallenge("id-1", "oracion-7-dias", KindDailySteps, &starts, []byte(`{"total_days":7,"group_streak_threshold":0.6}`))
	if err != nil || c.ID != "id-1" || c.TotalDays != 7 || c.GroupStreakThreshold != 0.6 || !c.StartsOn.Equal(starts) {
		t.Fatalf("BuildChallenge = %+v, %v", c, err)
	}

	bad := []struct {
		name, kind string
		startsOn   *time.Time
		config     string
		wantErr    string
	}{
		{"otro tipo", "quiz", &starts, `{"total_days":7}`, "no soportado"},
		{"sin fecha", KindDailySteps, nil, `{"total_days":7}`, "starts_on"},
		{"sin total_days", KindDailySteps, &starts, `{}`, "total_days"},
		{"total_days decimal", KindDailySteps, &starts, `{"total_days":7.5}`, "total_days"},
		{"total_days cero", KindDailySteps, &starts, `{"total_days":0}`, "total_days"},
		{"umbral fuera de rango", KindDailySteps, &starts, `{"total_days":7,"group_streak_threshold":1.5}`, "group_streak_threshold"},
		{"no es objeto", KindDailySteps, &starts, `[]`, "JSON"},
	}
	for _, b := range bad {
		t.Run(b.name, func(t *testing.T) {
			_, err := BuildChallenge("id", "x", b.kind, b.startsOn, []byte(b.config))
			if err == nil || !strings.Contains(err.Error(), b.wantErr) {
				t.Fatalf("error = %v, se esperaba uno que mencione %q", err, b.wantErr)
			}
		})
	}
}

func TestParseDailyStepsConfigDefaultsThreshold(t *testing.T) {
	cfg, err := ParseDailyStepsConfig([]byte(`{"total_days":5,"otra_clave":true}`))
	if err != nil || cfg.TotalDays != 5 || cfg.GroupStreakThreshold != DefaultGroupStreakThreshold {
		t.Fatalf("config = %+v, %v", cfg, err)
	}
}

func TestPossibleCheckinsCountsFromEachJoinDay(t *testing.T) {
	members := []EnrollmentActivity{
		{JoinedOn: date("2026-11-14"), Days: []int{1, 2}}, // desde el día 1
		{JoinedOn: date("2026-11-16"), Days: []int{3}},    // llegó el día 3
	}
	cases := map[string]int{
		"2026-11-13": 0,     // aún no empieza
		"2026-11-16": 3 + 1, // día 3
		"2026-11-20": 7 + 5, // día 7
		"2026-11-25": 7 + 5, // terminado: se queda en el día 7
	}
	for today, want := range cases {
		if got := firstEdition.PossibleCheckins(members, date(today)); got != want {
			t.Errorf("PossibleCheckins(%s) = %d, se esperaba %d", today, got, want)
		}
	}
}

func TestGroupDaysCountsOnlyWhoWasEnrolled(t *testing.T) {
	members := []EnrollmentActivity{
		{JoinedOn: date("2026-11-14"), Days: []int{1, 2, 3}},
		{JoinedOn: date("2026-11-14"), Days: []int{1, 3}},
		{JoinedOn: date("2026-11-16"), Days: []int{3}}, // llegó el día 3
	}
	got := firstEdition.GroupDays(members, date("2026-11-16"))
	want := []GroupDay{
		{Date: date("2026-11-14"), Enrolled: 2, Completed: 2},
		{Date: date("2026-11-15"), Enrolled: 2, Completed: 1},
		{Date: date("2026-11-16"), Enrolled: 3, Completed: 3},
	}
	if len(got) != len(want) {
		t.Fatalf("GroupDays devolvió %d días, se esperaban %d", len(got), len(want))
	}
	for i := range want {
		if !got[i].Date.Equal(want[i].Date) || got[i].Enrolled != want[i].Enrolled || got[i].Completed != want[i].Completed {
			t.Errorf("día %d = %+v, se esperaba %+v", i+1, got[i], want[i])
		}
	}
	if days := firstEdition.GroupDays(members, date("2026-11-13")); len(days) != 0 {
		t.Errorf("antes de empezar no debe haber días, hay %d", len(days))
	}
	if days := firstEdition.GroupDays(members, date("2026-12-01")); len(days) != 7 {
		t.Errorf("terminado el reto deben ser 7 días, hay %d", len(days))
	}
}
