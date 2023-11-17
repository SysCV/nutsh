package server

import "sync"

type mGpuPool struct {
	sync.Mutex
	ids []int
}

func (p *mGpuPool) Next() int {
	p.Lock()
	defer p.Unlock()

	var id = p.ids[0]
	p.ids = append(p.ids[1:], id)
	return id
}
