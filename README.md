# Dtube Community Support

Dtube is a video plateform using steem (to reward authors) and ipfs (to store videos)

Because users using Dtube doesn't contribute directly to persist videos on ipfs, DCS is one solution that allows to persist automaticaly dtube videos (instead of pinning manually).

## prerequisite

DCS needs IPFS to working. Please install go-ipfs

Download : https://dist.ipfs.io/#go-ipfs
Install : https://ipfs.io/docs/install/

# Install

Clone the repo
<<<<<<< HEAD

> cd ./dtube-community-support
> npm install

=======
cd ./dtube-community-support
npm install
>>>>>>> main


# Configuration

In default configuration, DCS will check for francophone videos. You can change that by modifying "tags" in config.js file.
"tags" is an array, you can add many tags in order to support multiple communities.


<<<<<<< HEAD
# Start the collector


This command will start the collector. it will detect new dtube content and add it on the ipfs node.
> npm start

# Other commande

## List all stored content

> npm run list --

This command takes the following arguments :
* -s=date : Sort by date (from newest to the oldest)
* -s=size : Sort by size
* -a=author : Display all content posted by the specified "author" (eg: npm run list -- -a=evildido)

## Return all authors 

> npm run listAuthor

## Display specific content

> npm run show --

This command takes the following argument :
* -p=pinset : Display informations about the pinset specified (eg: npm run show -- -p=QmSe462BD2S3EFhgwotGtjS86LJhzzsqqPUmR8j2vbHY4W)

## Store specifig content

> npm run add --

This command takes one argument
* -u='dtube url' : Please note that the dtube link must be between simple quotes (eg: npm run add -- -u='https://d.tube/#!/v/baart/icayiyv7')

## Delete Specific content

> npm run rm --

This command takes one argument
* -p=pinset : Delete the following pinset (eg: npm run rm -- -p=QmSe462BD2S3EFhgwotGtjS86LJhzzsqqPUmR8j2vbHY4W)

=======

# Start

npm start
>>>>>>> main
