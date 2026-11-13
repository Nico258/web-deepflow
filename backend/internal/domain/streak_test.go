package domain

import (
	"testing"
	"time"
)

func dates(ss ...string) []time.Time {
	out := make([]time.Time, len(ss))
	for i, s := range ss {
		out[i] = date(s)
	}
	return out
}

func TestPersonalStreak(t *testing.T) {
	today := date("2026-11-18")
	cases := []struct {
		name string
		days []time.Time
		want int
	}{
		{"sin actividad", nil, 0},
		{"solo hoy", dates("2026-11-18"), 1},
		{"hoy sin marcar no rompe la racha", dates("2026-11-16", "2026-11-17"), 2},
		{"termina hoy", dates("2026-11-16", "2026-11-17", "2026-11-18"), 3},
		{"un día sin completar la corta", dates("2026-11-14", "2026-11-16", "2026-11-17", "2026-11-18"), 3},
		{"lo último fue anteayer", dates("2026-11-15", "2026-11-16"), 0},
		{"duplicados y desorden", dates("2026-11-18", "2026-11-17", "2026-11-18", "2026-11-17"), 2},
		{"cruza de un reto a otro", dates("2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"), 5},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := PersonalStreak(tc.days, today); got != tc.want {
				t.Fatalf("PersonalStreak = %d, se esperaba %d", got, tc.want)
			}
		})
	}
}

func TestGroupStreakWithSixtyPercent(t *testing.T) {
	days := []GroupDay{
		{Date: date("2026-11-14"), Enrolled: 20, Completed: 12}, // 60 %: cuenta
		{Date: date("2026-11-15"), Enrolled: 20, Completed: 11}, // 55 %: no cuenta
		{Date: date("2026-11-16"), Enrolled: 20, Completed: 15},
		{Date: date("2026-11-17"), Enrolled: 21, Completed: 13},
		{Date: date("2026-11-18"), Enrolled: 21, Completed: 2}, // hoy, aún no alcanza
	}
	if got := GroupStreak(days, date("2026-11-18"), 0.6); got != 2 {
		t.Fatalf("GroupStreak = %d, se esperaba 2", got)
	}
}

func TestWonAsTeam(t *testing.T) {
	cases := []struct {
		d    GroupDay
		want bool
	}{
		{GroupDay{Enrolled: 20, Completed: 12}, true}, // ejemplo de la spec: 12 de 20
		{GroupDay{Enrolled: 20, Completed: 11}, false},
		{GroupDay{Enrolled: 5, Completed: 3}, true},
		{GroupDay{Enrolled: 0, Completed: 0}, false},
		{GroupDay{Enrolled: 5, Completed: 0}, false},
	}
	for _, c := range cases {
		if got := c.d.WonAsTeam(0.6); got != c.want {
			t.Errorf("WonAsTeam(%+v) = %v, se esperaba %v", c.d, got, c.want)
		}
	}
	if (GroupDay{Enrolled: 5, Completed: 0}).WonAsTeam(0) {
		t.Error("un día sin nadie que lo complete nunca cuenta, aunque el umbral sea 0")
	}
}
