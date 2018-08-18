#!/bin/bash

echo "Launching IPFS"
export IPFS_PATH=/opt/dcs/data
sh docker/start_ipfs.sh daemon --routing=dhtclient --enable-gc &

sleep 10
echo "Launching DCS"
yarn run start

tail -f docker/run.sh