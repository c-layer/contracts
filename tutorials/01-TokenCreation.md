
# Token Creation

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a first C-Layer token.
The token will only provides you with the basic ERC20 features.

### Start

##### 1- Go into the token module and start truffle
```bash
cd token && yarn develop
```

##### 2- Load definitions

You shall to load the definitions needed for this tutorial:

```javascript
accounts = await web3.eth.getAccounts()

MintableTokenDelegate = await artifacts.require('MintableTokenDelegate')
TokenCore = await artifacts.require('TokenCore')
TokenProxy = await artifacts.require('TokenProxy')
```

### Steps

##### 3- Create the simplest token delegate
```javascript
delegate = await MintableTokenDelegate.new()
delegate.address
```

If your delegate contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

##### 4- Create a token core
```javascript
core = await TokenCore.new('My Token Core', [ accounts[0] ])
core.address
```

If your token core contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

##### 5- Configure the token core with a delegate
```javascript
await core.defineTokenDelegate(1, delegate.address, [])
```

The result from the above command should returns with the receipt of the transaction
You have now obtain a core. In the following steps, we will see how to deploy a token with it.

##### 6- Create a token proxy
```javascript
token = await TokenProxy.new(core.address)
token.address
```

You have deployed a ERC20 proxy.
If you are on a live network, you might want to backup this address for later use.
It is already connected to the core, but it has no knowledge of itself.
if you were to request its name, symbol, decimals, supplies or any balances they would all be empty:
```javascript
token.name()
token.balanceOf(accounts[0])
```

You may list all the methods the token proxy provides with 
```javascript
Object.keys(token.methods)
```

##### 7- Define the proxy with in the core

In the command below, you need to provide the desired name, symbol et decimals
``` javascript
await core.defineToken(token.address, 1, "My Token", "MTK", 18)
```

You can replay the token proxy methods you called at the step 6 to verify that it has now all its attribute defined.

##### 8- Mint the token
The token supplies are still empty as we haven't minted any tokens.
Let's do it now:
``` javascript
supply = "42".padEnd(18, "0")
await core.mint(token.address, [ accounts[0] ], [ supply ])
await token.totalSupply().then((val) => val.toString())
```

``` javascript
await token.totalSupply().then((val) => val.toString())
await token.balanceOf(accounts[0]).then((val) => val.toString())
```

##### 9- Test a first transfer

``` javascript
await token.transfer(accounts[1], "3333")
await token.balanceOf(accounts[0]).then((val) => val.toString())
await token.balanceOf(accounts[1]).then((val) => val.toString())
```

And voila, you do own now a C-Layer token!

