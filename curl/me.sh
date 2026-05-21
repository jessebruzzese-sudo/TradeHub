#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
curl -vvv -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/me
