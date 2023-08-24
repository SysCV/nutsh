In this document, we walk through the development pipeline, from setting up the environment to compiling an executable runtime.

## Setup

Before you start coding, it's essential to set up the development environment. Refer to [build on host machine](/Contribution/Build#building-on-the-host-machine) for instructions on setting up the development environment, which is equivalent to achieving a successful build on your development machine.

## Interface

Interfaces between the frontend and the backend are defined using [OpenAPI v3.0](https://swagger.io/specification/), located in the `openapi` folder. In contrast, interfaces among various backend services are defined using [Protocol Buffers](https://protobuf.dev/), located in the `proto` folder. After making modifications to these definitions, you must generate code for the changes to take effect.

To generate code from OpenAPI definitions, execute:

```bash
task openapi
```

To generate code from Protocol Buffers definitions, execute:

```bash
task proto
```

## Developing

The codebase provides several convenient shortcuts to facilitate developing.

### Starting the Backend

```bash
task backend:start
```

### Starting the Backend with the SAM Module

First add the following line to `.env.local`. Modify as necessary based on your specific situation. If you don't have the required resources on hand, refer to the [SAM module quick start](/Quick%20Start#sam-module) for preparation instructions:

```bash
# address to the SAM module
NUTSH_ONLINE_SEGMENTATION="localhost:12345"

# arguments for the SAM module
NUTSH_SAM_DEVICE="cuda:0"
NUTSH_SAM_MODEL_TYPE="vit_h"
NUTSH_SAM_MODEL_CHECKPOINT="/path/to/sam/checkpoint/sam_vit_h_4b8939.pth"
NUTSH_SAM_DECODER_PATH="/path/to/sam/quantized/onnx/decoder/sam_vit_h_quantized.onnx"
```

Then start the SAM module:

```bash
task sam:start
```

Finally start the backend in another terminal session:

```bash
task backend:start
```

### Starting Frontend

```bash
task frontend:start
```

### Starting Documentation

```bash
task docs:start
```

## Test

We employ two levels of testing: unit tests and end-to-end tests. Unit tests run before building, while end-to-end tests run afterward.

### Unit Test

Execute the following command to run unit tests:

```bash
task test
```

Frontend unit tests adhere to the standard practices for React applications and should be placed in `app/frontend/src/test`.

Backend unit tests follow Go practices, similar to those found in `app/storage/sqlite3/exec`.

### End-to-end Test

:::caution

Ensure that both the [backend](#starting-the-backend) and the [frontend](#starting-frontend) are running before initiating the end-to-end test.

:::

[Cypress](https://www.cypress.io/) is used for end-to-end testing. To run the test, execute:

```bash
task e2e:run
```

To open an interactive browser for writing, viewing, or debugging tests, execute:

```bash
task e2e:open
```

End-to-end testing simulates a virtual user interacting with the application. As such, it's performed after the build process and remains code-agnostic, independent of the application's internal workings. To make the application's internal state accessible to the testing environment, when `REACT_APP_DEV===true`, specific states are assigned to a `testing` field within the `window` object. Refer to `app/frontend/src/component/Testing.tsx` for details.

All end-to-end test cases should be placed in `e2e/cypress/e2e`.

## Building

Consult the [build documentation](/Contribution/Build) for instructions on compiling the binary from the source code.

## Runtime

:::tip

The build core is a binary executables with all static files like frontends and docs embedded without any runtime dependencies.

:::

At runtime, the core follows this routing scheme:

- `/api`: Directs to the backend API server.
- `/app/_/*`: Returns the frontend's `index.html`. This will further determine the page to display using client-side routing. It may also initiate additional `/app` or `/api` requests from the browser.
- `/app`: Serves the frontend's built files, such as `static/` or `favicon.ico`.
- `/docs`: Provides the built files for the documentation.
- `/`: Functions the same as `/app`, allowing users to open the application simply with `http(s)://host:port/`.

For further details, refer to `main.go`, the application's entry point.
