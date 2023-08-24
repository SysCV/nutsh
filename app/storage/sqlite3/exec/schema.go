package exec

import (
	_ "embed"

	"github.com/pkg/errors"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"
)

//go:embed schema.sql
var schema string

func InitializeSchema(conn *sqlite.Conn) error {
	if err := sqlitex.ExecScript(conn, schema); err != nil {
		return errors.WithStack(err)
	}
	return nil
}
