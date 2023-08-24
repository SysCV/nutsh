package cmd

import (
	"fmt"
	"image"
	"image/png"
	"os"

	"github.com/pkg/errors"
	"go.uber.org/zap"
)

type mEntityId string

var offsets = []image.Point{
	{X: 0, Y: 1},
	{X: 0, Y: -1},
	{X: 1, Y: 0},
	{X: -1, Y: 0},
}

func loadPngMask(maskPath string) (map[mEntityId][]*Mask, error) {
	zap.L().Info("loading png mask", zap.String("path", maskPath))

	f, err := os.Open(maskPath)
	if err != nil {
		return nil, errors.WithStack(err)
	}
	defer f.Close()

	im, err := png.Decode(f)
	if err != nil {
		return nil, errors.Wrapf(err, "mask path: %s", maskPath)
	}

	b := im.Bounds()
	withinImage := func(p image.Point) bool {
		if p.X < b.Min.X || p.Y < b.Min.Y || p.X > b.Max.X || p.Y > b.Max.Y {
			return false
		}
		return true
	}

	visited := make(map[image.Point]bool)

	bfs := func(start image.Point) []image.Point {
		eid0 := pixelEntityId(im, start.X, start.Y)
		ps := []image.Point{start}
		visited[start] = true

		for i := 0; i < len(ps); i++ {
			p := ps[i]
			for _, o := range offsets {
				q := image.Point{
					X: p.X + o.X,
					Y: p.Y + o.Y,
				}
				if !withinImage(q) || visited[q] {
					continue
				}
				eid := pixelEntityId(im, q.X, q.Y)
				if eid != eid0 {
					continue
				}
				ps = append(ps, q)
				visited[q] = true
			}
		}
		return ps
	}

	masks := make(map[mEntityId][]*Mask)
	for x := b.Min.X; x <= b.Max.X; x++ {
		for y := b.Min.Y; y <= b.Max.Y; y++ {
			eid := pixelEntityId(im, x, y)
			if eid == "" {
				continue
			}

			start := image.Point{X: x, Y: y}
			if visited[start] {
				continue
			}
			component := bfs(start)

			minX, maxX, minY, maxY := x, x, y, y
			for _, p := range component {
				minX = min(minX, p.X)
				minY = min(minY, p.Y)
				maxX = max(maxX, p.X)
				maxY = max(maxY, p.Y)
			}
			w := maxX - minX + 1
			h := maxY - minY + 1
			mask := make([]bool, h*w)

			for _, p := range component {
				// column major
				idx := (p.X-minX)*h + (p.Y - minY)
				eidp := pixelEntityId(im, p.X, p.Y)
				if eidp == eid {
					mask[idx] = true
				}
			}

			if _, has := masks[eid]; !has {
				masks[eid] = make([]*Mask, 0)
			}
			masks[eid] = append(masks[eid], &Mask{
				Offset: []int{minX, minY},
				Rle: &RunLengthEncoding{
					CocoCounts: rleCountsToStringCOCO(encodeRLE(mask)),
					Size:       []int{h, w},
				},
			})
		}
	}

	return masks, nil
}

func pixelEntityId(im image.Image, x, y int) mEntityId {
	r, g, b, _ := im.At(x, y).RGBA()
	if r == 0 && g == 0 && b == 0 {
		return ""
	}
	return mEntityId(fmt.Sprintf("%d,%d,%d", r, g, b))
}

// This function is translated from the `encodeRLE function in `app/frontend/src/common/algorithm/rle.ts`.
func encodeRLE(mask []bool) []int {
	var counts []int

	N := len(mask)
	n := 0
	for i := 0; i < N; i++ {
		if !mask[i] {
			n++
			continue
		}
		counts = append(counts, n)
		n = 1
		for i+1 < N && mask[i] == mask[i+1] {
			n++
			i++
		}
		counts = append(counts, n)
		n = 0
	}
	if n > 0 {
		counts = append(counts, n)
	}

	return counts
}

// This function is translated from the `rleCountsToStringCOCO` function in `app/frontend/src/common/algorithm/rle.ts`.
func rleCountsToStringCOCO(counts []int) string {
	m := len(counts)
	s := make([]int, m*6)
	p := 0
	for i := 0; i < m; i++ {
		x := counts[i]
		if i > 2 {
			x -= counts[i-2]
		}
		more := true
		for more {
			c := x & 0x1f
			x >>= 5
			if c&0x10 > 0 {
				more = x != -1
			} else {
				more = x != 0
			}
			if more {
				c |= 0x20
			}
			c += 48
			s[p] = c
			p++
		}
	}
	str := ""
	for i := 0; i < len(s); i++ {
		if s[i] == 0 {
			break
		}
		str += string(rune(s[i]))
	}
	return str
}
