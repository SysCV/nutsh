FROM golang:1.19

ADD . /project

RUN \
    # task
    sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin && \
    # buf
    BUF_DIR="/usr/local/bin" && \
    BUF_VERSION="1.17.0" && \
    curl -sSL "https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-$(uname -s)-$(uname -m)" -o "${BUF_DIR}/buf" && \
    chmod +x "${BUF_DIR}/buf" && \
    # pre-install all golang dependencies
    cd /project && go mod download -x && \
    cd /project/module/sam && go mod download -x && \
    # for ptoto
    go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2
