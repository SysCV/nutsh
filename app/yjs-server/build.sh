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

cmd_base="pkg -c pkg.json --output bin/yjs-server"
input_file="dist/yjs-server.js"

# if both os and arch are set, modify the command to include the -t option
if [[ -n "$os" && -n "$arch" ]]; then
  target="node20-${os}-${arch}"
  cmd="$cmd_base -t ${target} $input_file"
else
  # bundle for the current platform
  cmd="$cmd_base $input_file"
fi

# execute the command
echo "Executing command: $cmd"
$cmd
