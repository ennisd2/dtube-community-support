# Dtube Community Support

Dtube is a video plateform using steem (to reward authors) and ipfs (to store videos)

Because users using Dtube doesn't contribute directly to persist videos on ipfs, DCS is one solution that allows to persist automaticaly dtube videos (instead of pinning manually).

## prerequisite

DCS needs IPFS to working. Please install go-ipfs

Download : https://dist.ipfs.io/#go-ipfs
Install : https://ipfs.io/docs/install/

# Install

Clone the repo
cd ./dtube-community-support
npm install


# Configuration

In default configuration, DCS will check for francophone videos. You can change that by modifying "tags" in config.js file.
"tags" is an array, you can add many tags in order to support multiple communities.



# Start

npm start
