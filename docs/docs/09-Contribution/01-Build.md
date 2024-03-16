This document provides instructions on how to build the application from its source code.
All commands should be executed from the root directory of the codebase.

:::tip

The codebase uses [Task](https://taskfile.dev/) to manage commands. You can always check the `Taskfile.yaml` (recursively) to see what happens behind the scenes.

:::

## Building on the Host Machine

:::tip

Refer to `container/devel.Dockerfile` for troubleshooting.
It serves as the authoritative guide for setting up the development and build environment from scratch.

:::

Successfully building on the host machine will also setup the development environment. Follow these steps to build the executables:

0. Ensure the following tools — [Task](https://taskfile.dev/), [buf](https://buf.build/), [node](https://nodejs.org), and [Go](https://go.dev/) — are available by checking their versions:

   ```bash
   task --version
   ```

   ```bash
   buf --version
   ```

   ```bash
   node --version
   ```

   ```bash
   npm --version
   ```

   ```bash
   go version
   ```

1. Install the necessary tools to generate Go code from OpenAPI and Protocol Buffers definitions:

   ```bash
   go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@v1.12 && \
   go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28 && \
   go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2
   ```

   :::caution
   After installation, run `oapi-codegen --version` to confirm that `$GOBIN` is in your `$PATH`. By default, `$GOBIN` points to `$GOPATH/bin`, which typically resolves to `$HOME/go/bin`.
   :::

2. Install dependencies:

   ```bash
   task frontend:install && \
   task docs:install && \
   task openapi && \
   task proto
   ```

3. Build the core:

   ```bash
   task build
   ```

   Upon successful build, a ` nutsh` binary should be present in the `build` folder.

4. Build the SAM module:

   ```
   task sam:build
   ```

   After this step, a `nutsh-sam` binary should appear in the `build` folder.

## Building inside Docker

We can build within a docker container to avoid affecting the host machine.

1. Build the devel image:

   ```bash
   docker build -t nutsh-tmp:devel -f container/devel.Dockerfile .
   ```

2. Build the runtime image for your host OS:

   ```bash
   GOOS=$(uname -s | tr '[:upper:]' '[:lower:]' | sed -e 's/darwin.*/darwin/' -e 's/linux.*/linux/' -e 's/windows.*/windows/') && \
   docker build -t nutsh-tmp:runtime --build-arg GOOS=$GOOS -f - . << EOF
       FROM nutsh-tmp:devel
       ARG GOOS
       ENV GOOS=$GOOS
       ADD . /project
       WORKDIR /project
       RUN task openapi && task proto && task build && task sam:build
   EOF
   ```

3. Copy the built binaries to the host machine:

   ```bash
   mkdir build && \
   docker run --rm --entrypoint tar nutsh-tmp:runtime -cC /project/build . | tar -xvC build && \
   chmod +x build/*
   ```

4. Cleanup:

   ```bash
   docker rmi $(docker images -q nutsh-tmp)
   ```
