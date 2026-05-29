#!/usr/bin/bash
DATA=$1
if [ -z "$DATA" ]; then
	DATA="creds.json"
fi
if [ ! -f "$DATA" ]; then
	echo "The file $DATA doesn't exist"
	exit 2
fi
if [ -z "$SETUP" ]; then
	source "setup.sh";
fi
curl -vvv -X POST -d @$DATA $BASE_URL/api/auth/login
