package config

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"strings"
)

// LoadDotEnv carga variables desde un archivo .env si existe, sin pisar las que ya
// están definidas en el entorno. Es una comodidad para desarrollo local: en
// producción no hay archivo .env y todo llega por el entorno del hosting.
func LoadDotEnv(path string) error {
	data, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	for i, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return fmt.Errorf("%s:%d: se esperaba CLAVE=valor", path, i+1)
		}
		key = strings.TrimSpace(strings.TrimPrefix(key, "export "))
		value = unquote(strings.TrimSpace(value))
		if _, exists := os.LookupEnv(key); !exists {
			if err := os.Setenv(key, value); err != nil {
				return err
			}
		}
	}
	return nil
}

func unquote(v string) string {
	if len(v) >= 2 && (v[0] == '"' || v[0] == '\'') && v[len(v)-1] == v[0] {
		return v[1 : len(v)-1]
	}
	return v
}
