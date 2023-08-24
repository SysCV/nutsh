package storage

type Error struct {
	Code  string `json:"code"`
	Field string `json:"field,omitempty"`
}

func (e *Error) Error() string {
	s := e.Code
	if e.Field != "" {
		s += "." + e.Field
	}
	return s
}

const (
	errUniqueFieldConflict = "ErrUniqueFieldConflict"
	errMissingField        = "ErrMissingField"
	errInvalidId           = "ErrInvalidId"
	errNotFound            = "ErrNotFound"
)

func ErrUniqueFieldConflict(field string) error {
	return &Error{
		Code:  errUniqueFieldConflict,
		Field: field,
	}
}

func ErrMissingField(field string) error {
	return &Error{
		Code:  errMissingField,
		Field: field,
	}
}

func ErrInvalidId() error {
	return &Error{
		Code: errInvalidId,
	}
}

func ErrNotFound() error {
	return &Error{
		Code: errNotFound,
	}
}

func IsErrNotFound(err error) bool {
	if bad, ok := err.(*Error); ok {
		return bad.Code == errNotFound
	}
	return false
}
