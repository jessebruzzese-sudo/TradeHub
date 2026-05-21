#!/usr/bin/bash
DATA=$1
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
if [ -z "$DATA" ]; then
	echo "Data file is required"
	exit 1
fi
curl -vvv -H "cookie: authorization=$JWT" -d @$DATA -X POST $BASE_URL/api/me/availability
