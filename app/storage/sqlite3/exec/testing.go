package exec

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/require"
	"zombiezen.com/go/sqlite"
)

func requireInitializeDatabase(t *testing.T) *sqlite.Conn {
	conn, err := sqlite.OpenConn("file::memory:?mode=memory", 0)
	require.NoError(t, err)

	err = InitializeSchema(conn)
	require.NoError(t, err)

	return conn
}

func requireInteger(t *testing.T, s string) int {
	v, err := strconv.Atoi(s)
	require.NoError(t, err)
	return v
}
