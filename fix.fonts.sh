#!/usr/bin/bash
BUILD_HOME=dist
FONT_MANIFEST=next-font-manifest.json
pushd $BUILD_HOME/server
if [ ! -f $FONT_MANIFEST ]; then
	echo Could not find file $FONT_MANIFEST
	exit 2
fi
ln -s $FONT_MANIFEST -T font-manifest.json
popd
