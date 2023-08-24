package sqlite3

import (
	"sync"
)

type mPatchVideoAnnotationMutex struct {
	mutexes sync.Map
}

func (m *mPatchVideoAnnotationMutex) Lock(id int) func() {
	value, _ := m.mutexes.LoadOrStore(id, &sync.Mutex{})
	mtx := value.(*sync.Mutex)
	mtx.Lock()

	return func() { mtx.Unlock() }
}
