#!/bin/bash

version="0.1.1"
default_os=$(uname -s)
default_arch=$(uname -m)

os=${GOOS:-$default_os}
arch=${GOARCH:-$default_arch}

if [[ "$os" == "linux" || "$os" == "Linux" ]]; then
  os="linux"
elif [[ "$os" == "darwin" || "$os" == "Darwin" ]]; then
  os="macos"
else
  echo "Unsupported OS"
  exit 1
fi

if [[ "$arch" == "amd64" || "$arch" == "x86_64" ]]; then
  arch="x64"
elif [[ "$arch" == "arm64" ]]; then
  arch="arm64"
else
  echo "Unsupported architecture"
  exit 1
fi

filename="y-sweet-${os}-${arch}.gz"
url="https://github.com/drifting-in-space/y-sweet/releases/download/v${version}/y-sweet-${os}-${arch}.gz"

# Download the file
mkdir -p bin
echo "downloading ${filename} from ${url} ..."
curl -sL $url | gzip -d > bin/y-sweet

echo "download completed"