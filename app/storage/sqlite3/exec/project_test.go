package exec

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func TestCreateProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateProjectReq{
		Name:     "foo",
		Remark:   "bar",
		SpecJson: "hello world",
	}

	p, err := CreateProject(ctx, conn, req)
	require.NoError(t, err)
	require.Equal(t, p.Name, req.Name)
	require.Equal(t, p.Remark, req.Remark)
	require.Nil(t, p.SpecJson)
	require.NotEmpty(t, p.Id)
}

func TestCreateProjectDuplicatedName(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateProjectReq{
		Name: "foo",
	}
	_, err := CreateProject(ctx, conn, req)
	require.NoError(t, err)
	_, err = CreateProject(ctx, conn, req)
	require.Error(t, err)
}

func TestListProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	n := 10
	for i := 0; i < n; i++ {
		_, err := CreateProject(ctx, conn, &nutshapi.CreateProjectReq{
			Name: fmt.Sprintf("foo%d", i),
		})
		require.NoError(t, err)
	}

	ps, err := ListProject(ctx, conn)
	require.NoError(t, err)
	require.Equal(t, n, len(ps))
}

func TestGetProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	req := &nutshapi.CreateProjectReq{
		Name:     "foo",
		Remark:   "bar",
		SpecJson: "hello world",
	}
	p, err := CreateProject(ctx, conn, req)
	require.NoError(t, err)

	id := requireInteger(t, p.Id)

	q, err := GetProject(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, p.Id, q.Id)
	require.Equal(t, p.Name, q.Name)
	require.Equal(t, p.Remark, q.Remark)
	require.NotNil(t, q.SpecJson)
	require.Equal(t, req.SpecJson, *q.SpecJson)
}

func TestGetProjectNotFound(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	_, err := GetProject(ctx, conn, 1)
	require.True(t, storage.IsErrNotFound(err))
}

func TestUpdateProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	p, err := CreateProject(ctx, conn, &nutshapi.CreateProjectReq{
		Name:   "foo",
		Remark: "bar",
	})
	require.NoError(t, err)
	id := requireInteger(t, p.Id)

	req := &nutshapi.UpdateProjectReq{
		Name:   "foo2",
		Remark: "bar2",
	}
	q, err := UpdateProject(ctx, conn, id, req)
	require.NoError(t, err)
	require.Equal(t, req.Name, q.Name)
	require.Equal(t, req.Remark, q.Remark)

	q_, err := GetProject(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, q.Name, q_.Name)
	require.Equal(t, q.Remark, q_.Remark)
}

func TestUpdateProjectDuplicatedName(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	_, err := CreateProject(ctx, conn, &nutshapi.CreateProjectReq{
		Name: "foo",
	})
	require.NoError(t, err)

	p, err := CreateProject(ctx, conn, &nutshapi.CreateProjectReq{
		Name: "foo2",
	})
	require.NoError(t, err)
	id := requireInteger(t, p.Id)

	_, err = UpdateProject(ctx, conn, id, &nutshapi.UpdateProjectReq{
		Name: "foo",
	})
	require.Error(t, err)
}

func TestDeleteProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	p, err := CreateProject(ctx, conn, &nutshapi.CreateProjectReq{
		Name:   "foo",
		Remark: "bar",
	})
	require.NoError(t, err)
	id := requireInteger(t, p.Id)

	q, err := DeleteProject(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, p.Name, q.Name)
	require.Equal(t, p.Remark, q.Remark)

	_, err = GetProject(ctx, conn, id)
	require.True(t, storage.IsErrNotFound(err))
}

func TestImportProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	videos := []struct {
		FrameUrls []string `json:"frame_urls"`
		Name      string   `json:"name"`
	}{
		{Name: "video1", FrameUrls: []string{"a", "b"}},
		{Name: "video2", FrameUrls: []string{"c", "d", "e"}},
	}

	p := nutshapi.CreateProjectReq{
		Name:     "foo",
		Remark:   "bar",
		SpecJson: "spec",
	}
	req := &nutshapi.ImportProjectReq{
		Project: p,
		Videos:  &videos,
		Annotations: &map[string]string{
			"video1": "anno1",
		},
	}
	q, err := ImportProject(ctx, conn, req)
	require.NoError(t, err)
	id := requireInteger(t, q.Id)

	q_, err := GetProject(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, q.Id, q_.Id)
	require.Equal(t, p.Name, q_.Name)
	require.Equal(t, p.Remark, q_.Remark)
	require.NotNil(t, q_.SpecJson)
	require.Equal(t, p.SpecJson, *q_.SpecJson)

	vs, err := ListVideos(ctx, conn, id)
	require.NoError(t, err)
	require.Equal(t, 2, len(vs))
	for idx, v_ := range vs {
		v := videos[idx]
		require.Equal(t, v.Name, v_.Name)

		vid := requireInteger(t, v_.Id)
		anno_, _, err := GetVideoAnnotation(ctx, conn, vid)
		require.NoError(t, err)
		anno := (*req.Annotations)[v.Name]
		if anno == "" {
			require.Nil(t, anno_)
		} else {
			require.NotNil(t, anno)
			require.Equal(t, anno, *anno_)
		}
	}
}

func TestExportProjectOk(t *testing.T) {
	ctx := context.Background()
	conn := requireInitializeDatabase(t)

	videos := []struct {
		FrameUrls []string `json:"frame_urls"`
		Name      string   `json:"name"`
	}{
		{Name: "video1", FrameUrls: []string{"a", "b"}},
		{Name: "video2", FrameUrls: []string{"c", "d", "e"}},
	}

	req := &nutshapi.ImportProjectReq{
		Project: nutshapi.CreateProjectReq{
			Name:     "foo",
			Remark:   "bar",
			SpecJson: "spec",
		},
		Videos: &videos,
		Annotations: &map[string]string{
			"video1": "anno1",
		},
	}
	p, err := ImportProject(ctx, conn, req)
	require.NoError(t, err)

	resp, err := ExportProject(ctx, conn, requireInteger(t, p.Id))
	require.NoError(t, err)
	require.Equal(t, p.Id, resp.Project.Id)
	require.Equal(t, req.Project.Name, resp.Project.Name)
	require.Equal(t, req.Project.Remark, resp.Project.Remark)
	require.NotNil(t, resp.Project.SpecJson)
	require.Equal(t, req.Project.SpecJson, *resp.Project.SpecJson)

	require.Equal(t, len(resp.Videos), len(videos))
	for i, v := range videos {
		v_ := resp.Videos[i]
		require.Equal(t, v_.Name, v.Name)
		require.Equal(t, v_.FrameUrls, v.FrameUrls)
	}

	require.Equal(t, resp.Annotations, *req.Annotations)
}
