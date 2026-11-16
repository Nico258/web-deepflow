package token

import (
	"bytes"
	"testing"
)

func TestNewIsRandomAndURLSafe(t *testing.T) {
	a, b := New(), New()
	if a == b {
		t.Fatal("dos tokens seguidos son iguales")
	}
	if len(a) != 43 { // base64url sin relleno de 32 bytes
		t.Fatalf("longitud = %d, se esperaba 43", len(a))
	}
	for _, r := range a {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_') {
			t.Fatalf("carácter no url-safe %q en %q", r, a)
		}
	}
}

func TestHash(t *testing.T) {
	if !bytes.Equal(Hash("abc"), Hash("abc")) {
		t.Fatal("el hash no es determinista")
	}
	if bytes.Equal(Hash("abc"), Hash("abd")) {
		t.Fatal("hashes iguales para tokens distintos")
	}
	if len(Hash("abc")) != 32 {
		t.Fatal("se esperaban los 32 bytes de SHA-256 (users.token_hash los exige)")
	}
}
