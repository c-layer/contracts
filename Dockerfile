FROM ethereum/solc:stable as build

FROM alpine
LABEL name=sirhill/truffle

COPY --from=build /usr/bin/solc /usr/bin/solc

RUN apk add --update bash vim less sudo openssh \
     nodejs yarn git openssl g++ tar python make curl

RUN mkdir /home/.yarn-global
RUN adduser -D -s /bin/bash -h /home/node -u 1000 node
USER node
RUN yarn config set prefix ~/.yarn-global
RUN yarn global add npm truffle ganache-cli
RUN echo "export PATH=$PATH:~/.yarn-global/bin" > ~/.bashrc

RUN mkdir /home/node/project
WORKDIR /home/node/project

RUN git clone https://github.com/tomlion/vim-solidity.git ~/.vim/
COPY .vimrc /home/node

EXPOSE 3000
EXPOSE 3001
EXPOSE 8080
EXPOSE 9545
ENTRYPOINT ["/bin/bash"]

