#!/usr/bin/bash
if [ -z "$JWT" ]; then
	echo "JWT not set, please login."
	exit 1
fi
TRADE=$1
if [ -z "$TRADE" ]; then
	echo "Missing trade"
	exit 1
fi
HOOKS="hookUserLocation=false&hookNearUsers=false&hookHaversine=false&hookMatches=false"
curl -H "cookie: authorization=$JWT" -X GET $BASE_URL/api/discovery/trades/$TRADE?$HOOKS
