package httpapi

import "net/http"

// apiError es cómo se presenta un código de error al cliente.
type apiError struct {
	status  int
	message string
}

// catalog es la única fuente de verdad de los códigos de error (specs/03 §6):
// código legible por máquina → estado HTTP y mensaje en español para mostrar.
// Los errores de dominio (domain.AllErrors) deben estar todos aquí; lo verifica un test.
var catalog = map[string]apiError{
	// 400
	"invalid_body":         {http.StatusBadRequest, "La petición no tiene un formato válido."},
	"invalid_query":        {http.StatusBadRequest, "Los parámetros de la consulta no son válidos."},
	"invalid_nickname":     {http.StatusBadRequest, "El nickname debe tener entre 3 y 7 caracteres: letras minúsculas sin tilde, números o guion bajo."},
	"nickname_not_allowed": {http.StatusBadRequest, "Ese nickname no está permitido, prueba con otro."},
	"terms_not_accepted":   {http.StatusBadRequest, "Para completar tu primer día tienes que aceptar el aviso de privacidad."},
	"invalid_day":          {http.StatusBadRequest, "Ese día no existe en este reto."},
	// 401 / 403 / 404
	"unauthorized": {http.StatusUnauthorized, "Tu sesión no es válida. Vuelve a registrarte con un nickname."},
	"forbidden":    {http.StatusForbidden, "No tienes permiso para hacer esto."},
	"not_found":    {http.StatusNotFound, "No encontramos lo que buscas."},
	// 409
	"nickname_taken":        {http.StatusConflict, "Ese nickname ya está en uso, prueba con otro."},
	"challenge_not_started": {http.StatusConflict, "El reto todavía no ha empezado."},
	"challenge_closed":      {http.StatusConflict, "El reto ya terminó."},
	"day_in_future":         {http.StatusConflict, "Ese día todavía no se abre."},
	"day_closed":            {http.StatusConflict, "Ese día ya se cerró."},
	// 413 / 429
	"body_too_large": {http.StatusRequestEntityTooLarge, "La petición es demasiado grande."},
	"rate_limited":   {http.StatusTooManyRequests, "Demasiadas peticiones. Intenta de nuevo en un momento."},
	// 5xx
	"internal":    {http.StatusInternalServerError, "Ocurrió un error inesperado."},
	"unavailable": {http.StatusServiceUnavailable, "El servicio no está disponible en este momento."},
}
