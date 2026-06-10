#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
JOB_ID=$1
if [ -z "$JOB_ID" ]; then
	echo "Missing jobId"
	exit 2
fi
curl -vvv -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/jobs/$JOB_ID
