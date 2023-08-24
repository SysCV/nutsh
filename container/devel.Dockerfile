FROM golang:1.19

ADD . /project

RUN \
    # node
    curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    # task
    sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin && \
    # buf
    BUF_DIR="/usr/local/bin" && \
    BUF_VERSION="1.17.0" && \
    curl -sSL "https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-$(uname -s)-$(uname -m)" -o "${BUF_DIR}/buf" && \
    chmod +x "${BUF_DIR}/buf" && \
    # cd
    cd /project && \
    # pre-install npm packages
    task frontend:install && \
    task docs:install && \
    task e2e:install && \
    # pre-install all golang dependencies
    go mod download -x && \
    go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@v1.12 && \
    # for ptoto
    go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.28 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.2
