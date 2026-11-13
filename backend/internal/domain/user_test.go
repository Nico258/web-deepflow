package domain

import (
	"errors"
	"testing"
)

func TestNormalizeNickname(t *testing.T) {
	ok := map[string]string{
		"maria":     "maria",
		"  Juan23 ": "juan23",
		"ABC":       "abc",
		"ana_g":     "ana_g",
		"a_b_c_d":   "a_b_c_d", // 7: el máximo
	}
	for in, want := range ok {
		got, err := NormalizeNickname(in)
		if err != nil || got != want {
			t.Errorf("NormalizeNickname(%q) = %q, %v; se esperaba %q", in, got, err, want)
		}
	}
	for _, in := range []string{"", "ab", "abcdefgh", "con esp", "josé", "a-b-c", "hola!", "ñandú"} {
		if _, err := NormalizeNickname(in); !errors.Is(err, ErrInvalidNickname) {
			t.Errorf("NormalizeNickname(%q) = %v, se esperaba invalid_nickname", in, err)
		}
	}
	if _, err := NormalizeNickname("PUT4"); !errors.Is(err, ErrNicknameNotAllowed) {
		t.Errorf("un nickname vulgar debía dar nickname_not_allowed, dio %v", err)
	}
}

func TestBlocklistCatchesVariations(t *testing.T) {
	for _, nick := range []string{
		"puta", "put4", "puuuta", "p_u_t_a", "xputox", "hpta", "hijuep",
		"m1erda", "zorra", "zorrra", "verga", "verg4", "culo", "c_u_l_o",
		"marica", "chimba", "pendejo", "huevon", "weon", "5hit", "fuck",
		"fuuuck", "bitch", "nazi", "hitler", "sexy", "porno", "t3t4s",
	} {
		if !IsNicknameBlocked(nick) {
			t.Errorf("%q debía quedar bloqueado", nick)
		}
	}
}

// Nombres y apodos comunes que NO deben bloquearse. Si una palabra nueva de la
// lista rompe alguno, agregar el nombre a allowedNicknameParts o afinar la palabra.
func TestBlocklistAllowsCommonNames(t *testing.T) {
	for _, nick := range []string{
		"ana", "juan", "maria", "sofia", "mateo", "santi", "valen", "nico", "laura",
		"camilo", "andres", "carlos", "dani", "pablo", "sebas", "majo", "mafe",
		"pipe", "caro", "luisa", "tomas", "david", "diego", "felipe", "alejo",
		"kevin", "brayan", "stiven", "yeison", "lucas", "emma", "samuel", "martin",
		"jacobo", "gabi", "cata", "juli", "lina", "tati", "isa", "simon", "mariano",
		"luciano", "adriana", "marcela", "maricel", "marisol", "teresa", "esteban",
		"vergara", "penelo", "nazira", "zorro", "pera", "espera", "pepe", "toto",
		"chucho", "pacho", "memo", "juanes", "falcao", "james", "dayana", "kike",
		"s3bas", "m4teo", "juan_07", "ana2010", "culebra", "putumay", "sexto",
	} {
		if IsNicknameBlocked(nick) {
			t.Errorf("%q no debía quedar bloqueado", nick)
		}
	}
}
