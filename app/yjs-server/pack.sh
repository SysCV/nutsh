#!/bin/bash

# map Go's os and arch to Node's
os=""
if [ "$GOOS" == "linux" ]; then
  os="linux"
elif [ "$GOOS" == "darwin" ]; then
  os="mac"
fi

arch=""
if [ "$GOARCH" == "amd64" ]; then
  arch="x64"
elif [ "$GOARCH" == "arm64" ]; then
  arch="arm64"
fi

rm -rf node_modules

# if both GOOS and GOARCH are set, modify the command to include the -t option
if [[ -n "$os" && -n "$arch" ]]; then
  # install dependencies w.r.t the os and arch
  echo "Cross-building for ${os}-${arch}"
  npm_config_platform=${os} npm_config_arch=${arch} npm install
else
  # install dependencies for the current platform
  echo "Building for the current platform"
  npm install
fi

# build
cross-env TS_NODE_PROJECT=\"tsconfig.webpack.json\" webpack