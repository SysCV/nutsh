package backend

type Error struct {
	Code string
}

func (e *Error) Error() string {
	return e.Code
}

func ErrMissingJsonPatch() error {
	return &Error{
		Code: "ErrMissingJsonPatch",
	}
}

func ErrOnlineSegmentationDisabled() error {
	return &Error{
		Code: "ErrOnlineSegmentationDisabled",
	}
}
