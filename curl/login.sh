#!/usr/bin/bash
curl -vvv -X POST -d @creds.json $BASE_URL/api/auth/login
