#!/bin/bash

set -e
if [[ `groups | grep -c "\bdocker\b"` -eq 1 ]]; then
        SUDO=""
else
        SUDO=sudo
fi

echo $SUDO
pwd
$SUDO docker run -it \
	-p 33000:3000 -p 33001:3001 -p 8080:8080 \
        -p 8545:8545 -p 9545:9545 \
        -v $PWD:/home/node/project \
	sirhill/hardhat
