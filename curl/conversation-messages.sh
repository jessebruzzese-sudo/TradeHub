#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
ID=$1
curl -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/conversations/$ID/messages
