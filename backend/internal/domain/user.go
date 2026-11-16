package domain

import (
	"regexp"
	"strings"
)

// User es una persona registrada. Solo nickname: no se guarda nombre ni ningún
// otro dato personal, porque en el grupo hay menores de edad (specs/00 §3).
type User struct {
	ID         string
	Nickname   string
	ShowOnWall bool
}

// NewUser son los datos para registrar a una persona. Del token solo llega el hash.
type NewUser struct {
	Nickname  string
	TokenHash []byte
}

// Formato del nickname (decidido, specs/03 §5): 3 a 7 caracteres, letras
// minúsculas sin tilde, números y guion bajo. Tan corto que no cabe un nombre
// completo. La migración repite la expresión en un CHECK.
const (
	NicknameMinLen = 3
	NicknameMaxLen = 7
)

var nicknamePattern = regexp.MustCompile(`^[a-z0-9_]{3,7}$`)

// NormalizeNickname recorta espacios, pasa a minúsculas, valida el formato y
// aplica el filtro de vulgaridades. «Juan» y «juan» son el mismo nickname; la
// unicidad la garantiza la base.
func NormalizeNickname(s string) (string, error) {
	n := strings.ToLower(strings.TrimSpace(s))
	if !nicknamePattern.MatchString(n) {
		return "", ErrInvalidNickname
	}
	if IsNicknameBlocked(n) {
		return "", ErrNicknameNotAllowed
	}
	return n, nil
}
