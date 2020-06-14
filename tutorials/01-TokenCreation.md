
# Token Creation

### Requirements

Your environment is setup as described [here](https://github.com/c-layer/contracts/blob/tutorials/tutorials/Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a first C-Layer token.
The token will only provides you with the basic ERC20 features.

### Start

##### 1- Go into the Core module and start truffle
```bash
  cd c-layer-core && truffle develop
```

##### 2- Always reompile the contracts to ensure you will be using the latest version
```javascript
compile
```

If everything is fine, you will endup with
```
Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.
```

### Steps

##### 3- Create a token delegate
```javascript
delegate = await TokenDelegate.new()
delegate.address
```

If your delegate contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

##### 4- Create a token core
```javascript
core = await TokenCore.new('My Token Core')
core.address
```

If your token core contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

##### 5- Configure the token core with a delegate
```javascript
core.defineTokenDelegate(0, delegate.address, [])
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
await core.defineToken(token.address, 0, "My Token", "MTK", 18)
```

You can replay the token proxy methods you called at the step 6 to verify that it has now all its attribute defined.

##### 8- Mint the token
The token supplies are still empty as we haven't minted any tokens.
Let's do it now:
``` javascript
supply = "42".padEnd(18, "0")
await core.mint(token.address, accounts[0], supply)
token.totalSupply()
```

``` javascript
token.totalSupply()
token.balanceOf(accounts[0])
```

##### 9- Test a first transfer

``` javascript
await token.transfer(accounts[1], "3333")
token.balanceOf(accounts[0])
token.balanceOf(accounts[1])
```

And voila, you do own now a C-Layer token!

