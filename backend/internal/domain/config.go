package domain

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
)

// KindDailySteps es el tipo de reto de pasos diarios (el de 7 días). Es el único
// que existe hoy; otro tipo traería su propio config y su propia tabla de hechos.
const KindDailySteps = "daily_steps"

// DefaultGroupStreakThreshold es el umbral decidido para la racha del grupo
// (specs/02 §4: 60 %). Se usa si el reto no define group_streak_threshold.
const DefaultGroupStreakThreshold = 0.6

// DailyStepsConfig es el challenges.config de un reto daily_steps (specs/04 §3).
// Claves documentadas en el README; las desconocidas se ignoran.
type DailyStepsConfig struct {
	TotalDays            int     // total_days: obligatoria, entera y > 0
	GroupStreakThreshold float64 // group_streak_threshold: opcional, entre 0 y 1
}

type rawDailyStepsConfig struct {
	TotalDays            *float64 `json:"total_days"`
	GroupStreakThreshold *float64 `json:"group_streak_threshold"`
}

// ParseDailyStepsConfig valida el config de un reto daily_steps.
func ParseDailyStepsConfig(data []byte) (DailyStepsConfig, error) {
	var raw rawDailyStepsConfig
	if err := json.Unmarshal(data, &raw); err != nil {
		return DailyStepsConfig{}, fmt.Errorf("config no es un objeto JSON válido: %w", err)
	}
	if d := raw.TotalDays; d == nil || *d <= 0 || *d != math.Trunc(*d) {
		return DailyStepsConfig{}, errors.New("config.total_days debe ser un entero mayor que 0")
	}
	cfg := DailyStepsConfig{
		TotalDays:            int(*raw.TotalDays),
		GroupStreakThreshold: DefaultGroupStreakThreshold,
	}
	if t := raw.GroupStreakThreshold; t != nil {
		if *t < 0 || *t > 1 {
			return DailyStepsConfig{}, errors.New("config.group_streak_threshold debe estar entre 0 y 1")
		}
		cfg.GroupStreakThreshold = *t
	}
	return cfg, nil
}
