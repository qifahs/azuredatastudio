#!/bin/bash


if [[ "$OSTYPE" == "darwin"* ]] || [[ "$AGENT_OS" == "Darwin"* ]]; then
	realpath() { [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"; }
	ROOT=$(dirname $(dirname $(realpath "$0")))
else
	ROOT=$(dirname $(dirname $(readlink -f $0)))
fi

cd $ROOT

if [[ "$OSTYPE" == "darwin"* ]] || [[ "$AGENT_OS" == "Darwin"* ]]; then
	NAME=`node -p "require('./product.json').nameLong"`
	CODE="./.build/electron/$NAME.app/Contents/MacOS/Electron"
else
	NAME=`node -p "require('./product.json').applicationName"`
	CODE=".build/electron/$NAME"
fi

# Node modules
test -d node_modules || yarn

# Get electron
node build/lib/electron.js || ./node_modules/.bin/gulp electron

# Unit Tests
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$AGENT_OS" == "Darwin"* ]]; then
	cd $ROOT ; ulimit -n 4096 ; \
		ELECTRON_ENABLE_LOGGING=1 \
		"$CODE" \
		test/electron/index.js "$@"
else
	cd $ROOT ; \
		ELECTRON_ENABLE_LOGGING=1 \
		"$CODE" \
		test/electron/index.js "$@"
fi
