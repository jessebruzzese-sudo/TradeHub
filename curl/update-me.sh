#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
DATA=$1
if [ ! -f "$DATA" ]; then
	echo "The file $DATA doesn't exist"
	exit 2
fi
curl -H "cookie: authorization=$JWT" -d @$DATA -X PUT $BASE_URL/api/me
