#!/usr/bin/bash
export BASE_URL=http://localhost:3000
export CURL_HOME=$PWD
export TRADE_HOME=$CURL_HOME/..
export KEYS=$TRADE_HOME/keys
export STAGING_KEY=$KEYS/staging.pem
export STAGING_BOX=3.107.50.52
export RELEASE=$TRADE_HOME/dist/release.tar.gz
export PACKAGE=$TRADE_HOME/package.json 
export CONFIG=$TRADE_HOME/*.config.js
export CONFIG_TS=$TRADE_HOME/drizzle.config.ts
export CONFIG_ENV=$TRADE_HOME/.env
export FONT_FIX=$TRADE_HOME/fix.fonts.sh
export SQL=$TRADE_HOME/drizzle/*.sql
export PUBLIC_IMAGES=$TRADE_HOME/public

alias deployapp="scp $RELEASE ubuntu@$STAGING_BOX:~/tradehub/dist"
alias deployconfig="scp $PACKAGE $CONFIG $CONFIG_TS $CONFIG_ENV $FONT_FIX ubuntu@$STAGING_BOX:~/tradehub"
alias deployimages="scp -r $PUBLIC_IMAGES ubuntu@$STAGING_BOX:~/tradehub"
alias deploysql="scp -r $SQL ubuntu@$STAGING_BOX:~/tradehub/drizzle"
alias trade="psql -d tradedev -U tradedev --port 5433 --host 192.168.1.134"
