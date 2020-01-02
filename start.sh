#!/bin/bash

pwd
sudo docker run -it \
	-p 33000:3000 -p 33001:3001 -p 8080:8080 \
        -p 8545:8545 -p 9545:9545 \
        -v $PWD:/home/node/project \
	sirhill/truffle
