#!/usr/bin/bash
DATA=$1
if [ -z "$DATA" ]; then
	echo "Missing data file"
	exit 1
fi
curl -X POST -d @$DATA $BASE_URL/api/auth/signup
