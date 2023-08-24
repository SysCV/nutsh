package sqlite3

type Error struct {
	Code string
}

func (e *Error) Error() string {
	return e.Code
}

func ErrFailedToGetConnection() error {
	return &Error{
		Code: "ErrFailedToGetConnection",
	}
}

func ErrFailedToEnableForeignKey() error {
	return &Error{
		Code: "ErrFailedToEnableForeignKey",
	}
}
