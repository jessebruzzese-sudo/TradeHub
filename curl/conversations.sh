#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
HOOKS=hookCheckProfiles=false
curl -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/conversations?$HOOKS
