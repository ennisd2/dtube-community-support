
# Dtube Community Support

Dtube is a video plateform using steem (to reward authors) and ipfs (to store videos)

Because users using Dtube doesn't contribute directly to persist videos on ipfs, DCS is one solution that allows to persist automaticaly dtube videos (instead of pinning manually).

## Installation with docker
Install Docker: https://docs.docker.com/install/
Install Docker Compose: https://docs.docker.com/compose/install/

### Installing on Ubuntu 16.04:
> apt-get update

> apt-get install docker-ce

> sudo curl -L https://github.com/docker/compose/releases/download/1.18.0/docker-compose-`uname -s\`-\`uname -m\` -o /usr/local/bin/docker-compose

> git clone https://github.com/evildido/dtube-community-support.git

> cd ./dtube-community-support

Edit the config.json file and customize your tags and RPC (optional)

- Build and test: `docker-compose up` (CTRL + C to exit)
Go have a coffee while it builds
- To launch in the background: `docker-compose up -d`
- To stop the container running in the background: `docker-compose down`
- To check the DCS output: `docker logs dcs`
- To check IPFS output: `docker logs ipfs`

### Running commands inside a Docker container
#### "SSH" into the container and run the commands
Enter the IPFS container: `docker exec -ti ipfs sh`
Once inside, execute the IPFS bandwidth stat command: `ipfs stats bw`

You can do the same thing with any command inside the dcs container:
> docker exec -ti dcs bash

Then, to list the videos being cached: `npm run list`
#### Using docker-compose
To execute the IPFS bandwidth stat command:
> docker-compose exec ipfs ipfs stats bw

To list video cached by DCS: 
> docker-compose exec dcs npm run list

To pin a DTube video with DCS:
> docker-compose exec dcs npm run add -- -u='https://d.tube/#!/v/bobaphet/dd8bx6c1'

For other commands, see below

### Logs and data files
Docker will mount the current data/ and log/ directories as volumes. This means you can access files inside those directories without entering the containers. This makes it easier for debugging or backup.

## Normal installation
### Prerequisites
DCS needs IPFS to working. Please install go-ipfs
Download : https://dist.ipfs.io/#go-ipfs
Install : https://ipfs.io/docs/install/

### Install
> git clone https://github.com/evildido/dtube-community-support.git
> cd ./dtube-community-support
> npm install

### Configuration
In default configuration, DCS will check for francophone videos. You can change that by modifying "tags" in config.js file.
"tags" is an array, you can add many tags in order to support multiple communities.

### Start the collector
This command will start the collector. it will detect new dtube content and add it on the ipfs node.
> npm start

## Other commands

#### List all stored content
> npm run list --

This command takes the following arguments :
* -s=date : Sort by date (from newest to the oldest)
* -s=size : Sort by size
* -a=author : Display all content posted by the specified "author" (eg: npm run list -- -a=evildido)

#### Return all authors
> npm run listAuthor

#### Display specific content
> npm run show --

This command takes the following argument :
* -p=pinset : Display informations about the pinset specified (eg: npm run show -- -p=QmSe462BD2S3EFhgwotGtjS86LJhzzsqqPUmR8j2vbHY4W)

#### Store specifig content
> npm run add --

This command takes one argument
* -u='dtube url' : Please note that the dtube link must be between simple quotes (eg: npm run add -- -u='https://d.tube/#!/v/baart/icayiyv7')

#### Delete Specific content
> npm run rm --

This command takes one argument
* -p=pinset : Delete the following pinset (eg: npm run rm -- -p=QmSe462BD2S3EFhgwotGtjS86LJhzzsqqPUmR8j2vbHY4W)
