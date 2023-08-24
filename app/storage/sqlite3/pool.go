package sqlite3

import (
	"context"

	"github.com/pkg/errors"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"
)

type connPool struct {
	path string
}

func (c *connPool) Get(ctx context.Context) (*sqlite.Conn, error) {
	// Initially I followed the example https://pkg.go.dev/zombiezen.com/go/sqlite#example-package-Http
	// to use `sqlitex.Open` to open a connection pool. However, at runtime occasionally and apparently randomly calling
	// `Get` from the pool will block, after the program is running for a sufficiently long time. I failed to identify
	// the reason behind the blocking, given that I have carefully checked that all connections attained by `Get` are
	// returned by `Put`. Therefore, we comprise to abandon using a pool but create a new connection every time, and
	// let's see if the blocking issue will occur again or not.
	conn, err := sqlite.OpenConn(c.path, 0)
	if err != nil {
		return nil, errors.WithStack(ErrFailedToGetConnection())
	}

	// Foreign key support must be manually enabled for *each connection*.
	// See section 2 `Enabling Foreign Key Support` of https://sqlite.org/foreignkeys.html
	if err := sqlitex.ExecuteTransient(conn, "PRAGMA foreign_keys = on", nil); err != nil {
		conn.Close()
		return nil, errors.WithStack(err)
	}

	// good
	return conn, nil
}

func (c *connPool) Put(conn *sqlite.Conn) {
	conn.Close()
}

func (c *connPool) Close() error {
	return nil
}
