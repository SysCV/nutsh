package exec

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/pkg/errors"
	"zombiezen.com/go/sqlite"
	"zombiezen.com/go/sqlite/sqlitex"

	"nutsh/app/storage"
	"nutsh/openapi/gen/nutshapi"
)

func CreateProject(ctx context.Context, conn *sqlite.Conn, req *nutshapi.CreateProjectReq) (*nutshapi.Project, error) {
	if err := sqlitex.ExecuteTransient(conn, `
		INSERT INTO projects
			(name, spec_json, remark)
		VALUES
			(:name, :spec_json, :remark)
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":name":      req.Name,
			":spec_json": req.SpecJson,
			":remark":    req.Remark,
		},
	}); err != nil {
		if bad := checkProjectBadRequest(err); bad != nil {
			return nil, bad
		}
		return nil, errors.WithStack(err)
	}

	id := conn.LastInsertRowID()
	return &nutshapi.Project{
		Id:     strconv.FormatInt(id, 10),
		Name:   req.Name,
		Remark: req.Remark,
	}, nil
}

func ListProject(ctx context.Context, conn *sqlite.Conn) ([]*nutshapi.Project, error) {
	var ps []*nutshapi.Project
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			id,
			name,
			remark
		FROM projects
		ORDER BY name ASC
	`, &sqlitex.ExecOptions{
		ResultFunc: func(stmt *sqlite.Stmt) error {
			ps = append(ps, &nutshapi.Project{
				Id:     strconv.FormatInt(stmt.ColumnInt64(0), 10),
				Name:   stmt.ColumnText(1),
				Remark: stmt.ColumnText(2),
			})
			return nil
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	return ps, nil
}

func GetProject(ctx context.Context, conn *sqlite.Conn, id int) (*nutshapi.Project, error) {
	var p *nutshapi.Project
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			id,
			name,
			spec_json,
			remark
		FROM projects
		WHERE id = :id
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id": id,
		},
		ResultFunc: func(stmt *sqlite.Stmt) error {
			specJson := stmt.ColumnText(2)
			p = &nutshapi.Project{
				Id:       strconv.FormatInt(stmt.ColumnInt64(0), 10),
				Name:     stmt.ColumnText(1),
				Remark:   stmt.ColumnText(3),
				SpecJson: &specJson,
			}
			return nil
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	if p == nil {
		return nil, storage.ErrNotFound()
	}

	return p, nil
}

func UpdateProject(ctx context.Context, conn *sqlite.Conn, id int, req *nutshapi.UpdateProjectReq) (*nutshapi.Project, error) {
	if err := sqlitex.ExecuteTransient(conn, `
		UPDATE projects SET
			name=:name,
			remark=:remark
		WHERE id=:id
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id":     id,
			":name":   req.Name,
			":remark": req.Remark,
		},
	}); err != nil {
		if bad := checkProjectBadRequest(err); bad != nil {
			return nil, bad
		}
		return nil, errors.WithStack(err)
	}

	return &nutshapi.Project{
		Id:     strconv.Itoa(id),
		Name:   req.Name,
		Remark: req.Remark,
	}, nil
}

func DeleteProject(ctx context.Context, conn *sqlite.Conn, id int) (*nutshapi.Project, error) {
	project, err := GetProject(ctx, conn, id)
	if err != nil {
		return nil, errors.WithStack(err)
	}

	if err := sqlitex.ExecuteTransient(conn, `DELETE FROM projects WHERE id=:id`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":id": id,
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	return project, nil
}

func ImportProject(ctx context.Context, conn *sqlite.Conn, req *nutshapi.ImportProjectReq) (*nutshapi.Project, error) {
	// insert project
	if err := sqlitex.ExecuteTransient(conn, `
		INSERT INTO projects
			(name, spec_json, remark)
		VALUES
			(:name, :spec_json, :remark)
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":name":      req.Project.Name,
			":spec_json": req.Project.SpecJson,
			":remark":    req.Project.Remark,
		},
	}); err != nil {
		if bad := checkProjectBadRequest(err); bad != nil {
			return nil, bad
		}
		return nil, errors.WithStack(err)
	}
	projectId := conn.LastInsertRowID()
	project := &nutshapi.Project{
		Id:     strconv.FormatInt(projectId, 10),
		Name:   req.Project.Name,
		Remark: req.Project.Remark,
	}
	if req.Videos == nil {
		return project, nil
	}

	// insert videos
	annos := make(map[string]string)
	if req.Annotations != nil {
		annos = *req.Annotations
	}

	named := map[string]interface{}{
		":project_id": projectId,
	}
	var values []string
	for idx, v := range *req.Videos {
		annoJson := annos[v.Name]

		k1 := fmt.Sprintf("name%d", idx)
		k2 := fmt.Sprintf("frame_urls%d", idx)
		named[":"+k1] = v.Name
		named[":"+k2] = strings.Join(v.FrameUrls, ",")
		if annoJson == "" {
			values = append(values, fmt.Sprintf("(:project_id, :%s, :%s, NULL)", k1, k2))
		} else {
			k3 := fmt.Sprintf("annotation_json%d", idx)
			named[":"+k3] = annoJson
			values = append(values, fmt.Sprintf("(:project_id, :%s, :%s,:%s)", k1, k2, k3))
		}
	}
	query := fmt.Sprintf(`
		INSERT INTO videos
			(project_id, name, frame_urls, annotation_json)
		VALUES
			%s
	`, strings.Join(values, ","))

	if err := sqlitex.ExecuteTransient(conn, query, &sqlitex.ExecOptions{Named: named}); err != nil {
		return nil, errors.WithStack(err)
	}

	return project, nil
}

func ExportProject(ctx context.Context, conn *sqlite.Conn, id int) (*nutshapi.ExportProjectResp, error) {
	// project
	project, err := GetProject(ctx, conn, id)
	if err != nil {
		return nil, err
	}

	// videos
	videos := make([]nutshapi.ExportProjectRespVideo, 0)
	annotations := make(map[string]string)
	if err := sqlitex.ExecuteTransient(conn, `
		SELECT
			id,
			name,
			frame_urls,
			annotation_json
		FROM videos
		WHERE project_id = :project_id
		ORDER BY name ASC
	`, &sqlitex.ExecOptions{
		Named: map[string]interface{}{
			":project_id": id,
		},
		ResultFunc: func(stmt *sqlite.Stmt) error {
			video := nutshapi.ExportProjectRespVideo{
				Id:        strconv.FormatInt(stmt.ColumnInt64(0), 10),
				Name:      stmt.ColumnText(1),
				FrameUrls: strings.Split(stmt.ColumnText(2), ","),
			}
			videos = append(videos, video)

			anno := stmt.ColumnText(3)
			if anno != "" {
				annotations[video.Name] = anno
			}

			return nil
		},
	}); err != nil {
		return nil, errors.WithStack(err)
	}

	return &nutshapi.ExportProjectResp{
		Annotations: annotations,
		Project:     *project,
		Videos:      videos,
	}, nil
}

func checkProjectBadRequest(err error) error {
	if strings.Contains(err.Error(), "UNIQUE constraint failed: projects.name") {
		return storage.ErrUniqueFieldConflict("projects.name")
	}
	return nil
}
