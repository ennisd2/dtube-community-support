FROM node:9.6.1

WORKDIR /usr/local/src
RUN wget https://dist.ipfs.io/go-ipfs/v0.4.17/go-ipfs_v0.4.17_linux-amd64.tar.gz
RUN tar xvzf go-ipfs_v0.4.17_linux-amd64.tar.gz

WORKDIR /usr/local/src/go-ipfs/
RUN sh install.sh

COPY . /opt/dcs
WORKDIR /opt/dcs
RUN chown node: * -R
RUN yarn install
