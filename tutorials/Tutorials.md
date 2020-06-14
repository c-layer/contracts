
# Tutorial

A Step by Step learning for the C-Layer.
This tutorial requires you have truffle already installed.

See the [requirements](#requirements) for more information.

### Beginner level

01. [Your First Token](./01-TokenCreation.md)
02. [Basic Compliance](./02-BasicTokenCompliance.md)
03. [Becoming a rates provider](./03-RatesProvider.md)
04. [Any Users can register](./04-UserRegistry.md)

### Intermediate level

11. Adding an Issuable Delegate
12. Start your first sale
13. Let's the crowd vote
14. DistributingDividends
15. Changing the rules

### Expert level

21. Setup a factory
22. Use a token with limited AML
23. Enterprise access control
24. Update a token delegate

### Requirements

##### 1- Truffle
You can use truffle environment provided with the [start.sh](../start.sh) script.
This will ensure you have the correct environment required and avoid any versions conflict with already installed dependencies.
The provided docker image is based on ethereum/solc but include as well the environment for installing node packages. 

An alternative is to install node on your environment and add truffle and the needed requirements globaly: 
`npm i -g truffle ganache-cli`

##### 2- Node packages
Once truffle is installed, you may proceed to install the different node packages for each module:
- In the ```c-layer-core``` directory run: `npm install`
- In the ```c-layer-oracle``` directory run: `npm install`

##### 3- Live network
If you plan to run the tutorial on a live network (either ropsten or mainnet), you will need to configure an infura projectId and your mnemonic.

The infura projectId may be obtain from infura website once logged in.
A mnemonic can be generated with [myetherwallet](https://www.myetherwallet.com/create-wallet)

Renaming the `secret.json` file into `.secret.json` and edit it with the correct projectId and mnemonic values.



