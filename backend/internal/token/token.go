// Package token genera y hashea los tokens de dispositivo (specs/03 §2). Del
// token solo se guarda su hash en la base.
package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
)

const size = 32

// New genera un token de dispositivo: 32 bytes del CSPRNG en base64url sin relleno.
// Se le devuelve a la persona una sola vez; en la base solo queda Hash(token).
func New() string {
	b := make([]byte, size)
	_, _ = rand.Read(b) // desde Go 1.24 crypto/rand.Read nunca devuelve error
	return base64.RawURLEncoding.EncodeToString(b)
}

// Hash devuelve el SHA-256 del token: los 32 bytes que se guardan en
// users.token_hash (bytea).
//
// Basta un hash rápido porque el token es aleatorio y de alta entropía, no una
// contraseña elegida por una persona; además permite buscar por igualdad.
func Hash(tok string) []byte {
	sum := sha256.Sum256([]byte(tok))
	return sum[:]
}
