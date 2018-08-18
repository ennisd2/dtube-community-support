#!/bin/bash

echo "Launching IPFS"
sh docker/start_ipfs.sh daemon --routing=dhtclient --enable-gc &

sleep 10
echo "Launching DCS"
yarn run start