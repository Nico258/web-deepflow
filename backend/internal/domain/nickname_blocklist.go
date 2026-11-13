package domain

import (
	"regexp"
	"strings"
)

// Filtro de nicknames vulgares u ofensivos (specs/03 §5). El muro lo ve todo el
// grupo, y en el grupo hay menores.
//
// Cómo funciona:
//  1. Se normaliza el nickname: minúsculas, sin «_», y números por letras
//     parecidas (0→o, 1→i, 3→e, 4→a, 5→s, 7→t).
//  2. Se quitan las partes permitidas (nombres comunes que contienen una palabra
//     bloqueada, p. ej. «vergara»).
//  3. Se rechaza si CONTIENE alguna palabra bloqueada. Cada letra de la palabra
//     admite repeticiones, así que «puuuta» cae igual que «puta».
//
// Ningún filtro es perfecto: lo que se cuele lo quita un líder borrando la cuenta.
// Al ampliar la lista, agregar el caso al test y comprobar que los nombres
// comunes del test siguen pasando.

// blockedNicknameWords se escriben en minúsculas, sin tildes y como mucho de 7
// letras (un nickname no puede tener más): de las palabras largas va la raíz.
var blockedNicknameWords = []string{
	// Español (Colombia)
	"puta", "puto", "hpta", "hijuep", "gonorr", "malpari", "chimba", "verga",
	"culo", "culia", "culea", "marica", "marico", "cacorr", "marimac", "mierd",
	"pendej", "huevon", "guevon", "weon", "zorra", "perra", "pirob", "cagad",
	"cagon", "estupid", "idiota", "imbecil", "tarado", "pene", "vagina", "teta",
	"sexo", "sexy", "porn", "violad", "nazi", "hitler",
	// Inglés
	"fuck", "shit", "bitch", "pussy", "cunt", "nigg", "whore", "slut",
}

// allowedNicknameParts son nombres o palabras comunes que contienen una palabra
// bloqueada y no deben rechazarse.
var allowedNicknameParts = []string{
	"vergara", // apellido común: contiene «verga»
	"penelo",  // Penélope: contiene «pene»
	"nazir",   // nombre: contiene «nazi»
	"nazim",   // nombre: contiene «nazi»
}

var leetReplacer = strings.NewReplacer(
	"_", "",
	"0", "o", "1", "i", "3", "e", "4", "a", "5", "s", "7", "t",
)

var blockedNicknamePattern = compileBlocklist(blockedNicknameWords)

// compileBlocklist arma una sola expresión donde cada letra admite repeticiones:
// «puta» → p+u+t+a+.
func compileBlocklist(words []string) *regexp.Regexp {
	alternatives := make([]string, len(words))
	for i, w := range words {
		var b strings.Builder
		for _, r := range w {
			b.WriteString(regexp.QuoteMeta(string(r)))
			b.WriteByte('+')
		}
		alternatives[i] = b.String()
	}
	return regexp.MustCompile(strings.Join(alternatives, "|"))
}

// IsNicknameBlocked indica si el nickname contiene una palabra bloqueada.
func IsNicknameBlocked(nickname string) bool {
	n := leetReplacer.Replace(strings.ToLower(nickname))
	for _, ok := range allowedNicknameParts {
		n = strings.ReplaceAll(n, ok, "")
	}
	return blockedNicknamePattern.MatchString(n)
}
