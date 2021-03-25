
# Basic Token Compliance

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you how to manage the basic compliance features of a C-Layer token: seize, freeze, and canTransfer.


### Start

##### 1- Go into the token module and start truffle
```bash
cd token && yarn develop
```

##### 2- Load definitions

You shall to load the definitions needed for this tutorial:

```javascript
accounts = await web3.eth.getAccounts()

TokenDelegate = await artifacts.require('TokenDelegate')
TokenCore = await artifacts.require('TokenCore')
TokenProxy = await artifacts.require('TokenProxy')
```

##### 3- Load contracts

If you are on a live network you can reimport the core contract using the following command

```javascript
core = await TokenCore.at("0x.......")
```

Otherwise, you will have to replay the following step from the [token creation tutorial](./01-TokenCreation.md)
```javascript
core = await TokenCore.new('My Token Core', [ accounts[0] ])
```

Let's now create and configure a delegate which contains a token logic different from first tutorial:
```javascript
delegate = await TokenDelegate.new()
await core.defineTokenDelegate(2, delegate.address, [1, 2])
token = await TokenProxy.new(core.address)
await core.defineToken(token.address, 2, "My Token", "MTK", 18)
supply = "42" + "0".padEnd(18, "0")
await core.mint(token.address, [ accounts[0] ], [ supply ])
```

### Steps

##### 4- Test transferability

```javascript
await token.canTransfer(accounts[0], accounts[1], "1000000000").then((x) => x.toString())
```

If the transfer can be executed, the result should be 1.
Other transfer code are defined in the [TokenStorage](../token/contracts/interface/ITokenStorage.sol) interface.

You can try for example to send to many tokens as below
```javascript
await token.canTransfer(accounts[0], accounts[1], "1000" + "0".padEnd(18, "0")).then((x) => x.toString())
```
It should returns 4 (insufficient tokens)

##### 5- Freezing an address

Let's start by sending some tokens to a friend:
```javascript
await token.transfer(accounts[1], 10000)
```

It should be able to send some tokens back now
```javascript
await token.canTransfer(accounts[1], accounts[0], "1000").then((x) => x.toString())
```

Let's freeze his address for 5 years
```javascript
until = new Date("2025-01-01").getTime()/1000
await core.freezeManyAddresses(token.address, [ accounts[1] ], until)
```

The following commands should both return 6 (addresses frozen):
```javascript
await token.canTransfer(accounts[0], accounts[1], 1).then((x) => x.toString())
await token.canTransfer(accounts[1], accounts[0], 1).then((x) => x.toString())
```

And the following should both return 1 as neither accounts[0] or accounts[2] are frozen:
```javascript
await token.canTransfer(accounts[0], accounts[2], 1).then((x) => x.toString())
await token.canTransfer(accounts[2], accounts[0], 1).then((x) => x.toString())
```

And a transfer should fail. Optionnaly truffle might reports you with the following error ["CO03"](../common/contracts/core/Core.sol#L17)
```javascript
await token.transfer(accounts[0], 1, { from: accounts[1] })
```

##### 6- Locking the token

Sometime, it's not about a specific address but rather some transfers which need to be locked.

The following command will let you lock account 2 from receiving any tokens for one day
```javascript
start = Math.floor(new Date().getTime()/1000)
end = start + 3600 * 24
ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

await core.defineLock(token.address, ANY_ADDRESSES, accounts[2], start, end)
```

Therefore the following command should both return 5 (transfer locked):
```javascript
await token.canTransfer(accounts[0], accounts[2], 1).then((x) => x.toString())
await token.canTransfer(accounts[3], accounts[2], 1).then((x) => x.toString())
```

And a tranfer should fail. Optionnaly truffle might reports you with the following error ["CO03"](../common/contracts/core/Core.sol#L17)
```javascript
await token.transfer(accounts[0], 1, { from: accounts[2] })
```

##### 7- Seize tokens

Although we froze one friend and prevented another friend to receiven, we can still recover our tokens.
To do that we need to seize it with the following commands:

```javascript
await core.seize(token.address, accounts[1], 1000)
```

We should have retrieve all our tokens back:
```javascript
await token.balanceOf(accounts[0]).then((val) => val.toString())
await token.balanceOf(accounts[1]).then((val) => val.toString())
```

You should be able by now to handle most compliance requirements
