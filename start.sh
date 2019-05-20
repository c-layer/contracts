#!/bin/bash

CURRENT_DIR=`pwd`
echo $CURRENT_DIR
sudo docker run -it \
	-p 33000:3000 -p 33001:3001 -p 8080:8080 \
        -p 8545:8545 -p 9545:9545 \
        -v $CURRENT_DIR:/home/node/project \
	sirhill/truffle


