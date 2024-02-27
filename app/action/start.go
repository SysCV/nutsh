package action

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.uber.org/zap"

	"nutsh/app/backend"
	"nutsh/app/storage/localfs"
	"nutsh/app/storage/sqlite3"
	"nutsh/openapi/gen/nutshapi"
)

const publicUrlPrefix = "/public/"

func Start(ctx context.Context) error {
	zap.L().Info("configuration",
		zap.String("workspace", StorageOption.Workspace),
		zap.Int("port", StartOption.Port),
		zap.Bool("readonly", StartOption.Readonly),
		zap.String("online_segmentation", StartOption.OnlineSegmentationAddr),
		zap.String("track", StartOption.TrackAddr),
	)

	// server
	e := echo.New()
	e.HideBanner = true
	middlewares := []echo.MiddlewareFunc{
		middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
			LogURI:        true,
			LogStatus:     true,
			LogMethod:     true,
			LogLatency:    true,
			LogError:      true,
			LogValuesFunc: logValuesFunc,
		}),
		middleware.GzipWithConfig(middleware.GzipConfig{
			Level: 9,
		}),
		ensureIsolatedCrossOriginMiddleware(),
	}
	if StartOption.Readonly {
		middlewares = append(middlewares, readonlyMiddleware())
	}
	e.Use(middlewares...)

	// proxy yjs-server ws
	yjsPort := mustStartYJSServer()
	e.Any("/ws/*", func(c echo.Context) error {
		target := fmt.Sprintf("http://127.0.0.1:%d", yjsPort)
		targetUrl, err := url.Parse(target)
		if err != nil {
			return err
		}

		proxy := httputil.NewSingleHostReverseProxy(targetUrl)
		proxy.Director = func(req *http.Request) {
			req.URL.Scheme = targetUrl.Scheme
			req.URL.Host = targetUrl.Host
			req.URL.Path = "/" + c.Param("*")
		}

		proxy.ServeHTTP(c.Response(), c.Request())
		return nil
	})

	// local data
	if StartOption.DataDir != "" {
		zap.L().Info("serving local data", zap.String("dir", StartOption.DataDir))
		e.Static("/data", StartOption.DataDir)
	}

	// backend
	s, teardown, err := createServer()
	if err != nil {
		return err
	}
	defer teardown()

	// normal api
	apiRouter := e.Group("/api")
	nutshapi.RegisterHandlers(apiRouter, nutshapi.NewStrictHandler(s, nil))

	// stream api
	streamRouter := apiRouter.Group("/stream")
	streamRouter.POST("/track", s.TrackStream)

	// public
	e.Static(publicUrlPrefix, publicDir())

	// docs
	e.StaticFS("/docs", StartOption.Doc)

	// frontend
	e.FileFS("/app/_/*", "index.html", StartOption.Frontend)
	e.StaticFS("/app", StartOption.Frontend)
	e.StaticFS("/", StartOption.Frontend)

	// start
	lisAddr := fmt.Sprintf(":%d", StartOption.Port)
	return e.Start(lisAddr)
}

func logValuesFunc(c echo.Context, v middleware.RequestLoggerValues) error {
	// https://github.com/labstack/echo/issues/2015
	status := v.Status
	if v.Error != nil {
		switch e := v.Error.(type) {
		case *echo.HTTPError:
			status = e.Code
		default:
			status = http.StatusInternalServerError
		}
	}
	zap.L().Info("request",
		zap.String("method", v.Method),
		zap.String("uri", v.URI),
		zap.Duration("latency", v.Latency),
		zap.Int("status", status),
	)
	return nil
}

func createServer() (backend.Server, func(), error) {
	var opts []backend.Option

	// storage
	db, err := sqlite3.New(filepath.Join(databaseDir(), "db.sqlite3"))
	if err != nil {
		return nil, nil, err
	}

	opts = append(opts,
		backend.WithProjectStorage(db.ProjectStorage()),
		backend.WithVideoStorage(db.VideoStorage()),
		backend.WithPublicStorage(localfs.NewPublic(publicDir(), publicUrlPrefix)),
		backend.WithSampleStorage(localfs.NewSample(sampleDir())),
		backend.WithDataDir(StartOption.DataDir),
		backend.WithOnlineSegmentationServerAddr(StartOption.OnlineSegmentationAddr),
		backend.WithTrackServerAddr(StartOption.TrackAddr),
		backend.WithConfig(&nutshapi.Config{
			Readonly:                  StartOption.Readonly,
			OnlineSegmentationEnabled: StartOption.OnlineSegmentationAddr != "",
			TrackEnabled:              StartOption.TrackAddr != "",
		}),
	)

	// backend
	s, err := backend.New(opts...)
	if err != nil {
		return nil, nil, err
	}

	return s, func() { db.Close() }, nil
}

// Enable using `SharedArrayBuffer` to speed up ONNX model inference.
// To check if it is working, observe if it is `ort-wasm-simd-threaded.wasm` or `ort-wasm-simd.wasm` that is downloaded.
// https://developer.chrome.com/blog/enabling-shared-array-buffer/#cross-origin-isolation
func ensureIsolatedCrossOriginMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Cross-Origin-Opener-Policy", "same-origin")
			c.Response().Header().Set("Cross-Origin-Embedder-Policy", "require-corp")
			return next(c)
		}
	}
}

func readonlyMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			method := c.Request().Method
			if method == "GET" || method == "HEAD" || method == "OPTIONS" || method == "TRACE" {
				// fine
				return next(c)
			}

			// certain POST requests should also be allowed
			if method == "POST" {
				path := c.Request().URL.Path
				if path == "/api/stream/track" {
					return next(c)
				}
			}

			return echo.NewHTTPError(http.StatusMethodNotAllowed)
		}
	}
}

func publicDir() string {
	return filepath.Join(StorageOption.Workspace, "public")
}

func sampleDir() string {
	return filepath.Join(StorageOption.Workspace, "sample")
}

func databaseDir() string {
	// Yeah, `dabatase` it is a typo. which is noticed too late...
	// To not affecting existing deployment, we introduce the following check temporarily.
	old := filepath.Join(StorageOption.Workspace, "dabatase")
	if _, err := os.Stat(old); !os.IsNotExist(err) {
		return old
	}
	return filepath.Join(StorageOption.Workspace, "database")
}

func mustStartYJSServer() int {
	// create a temporary file
	bin, err := os.CreateTemp("", "nutsh-yjs-*")
	mustOk(err)

	// write the embedded binary to the temporary file
	_, err = bin.Write(StartOption.YJSServer)
	mustOk(err)
	mustOk(bin.Close())

	// make the file executable
	mustOk(os.Chmod(bin.Name(), 0755))

	// prepare arguments
	internalPort := mustFindFreePort()
	dir := filepath.Join(StorageOption.Workspace, "yjs")

	// execute the binary in a new process
	cmd := exec.Command(bin.Name())
	cmd.Env = []string{
		fmt.Sprintf("PORT=%d", internalPort),
		fmt.Sprintf("DATA_DIR=%s", dir),
	}
	zap.L().Info("start yjs-server server", zap.Int("port", internalPort), zap.String("dir", dir))

	cmd.Stderr = os.Stderr
	cmd.Stdout = os.Stdout

	go func() {
		defer os.Remove(bin.Name())
		mustOk(cmd.Run())
	}()

	return internalPort
}

func mustFindFreePort() int {
	addr, err := net.ResolveTCPAddr("tcp", "localhost:0")
	mustOk(err)

	l, err := net.ListenTCP("tcp", addr)
	mustOk(err)
	defer l.Close()

	return l.Addr().(*net.TCPAddr).Port
}

func mustOk(err error) {
	if err == nil {
		return
	}

	if os.Getenv("DEBUG") != "" {
		fmt.Printf("%+v\n", err)
	} else {
		fmt.Printf("%v\n", err)
	}
	os.Exit(1)
}
