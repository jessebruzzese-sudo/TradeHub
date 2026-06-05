#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
PROFILE_ID=$1
if [ -z "$PROFILE_ID" ]; then
	echo "Missing profile id argument"
	exit 1
fi
curl -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/profile/$PROFILE_ID
