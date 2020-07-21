
# Basic Token Compliance

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

You should also have created a token. See the first tutorial [here](./01-TokenCreation.md) if needed.

### Goals

This tutorial will guide you how to manage the basic compliance features of a C-Layer token: seize, freeze, and canTransfer.

### Start

You must start `truffle` from the token module
```bash
  cd token && truffle develop
```

### Load contracts

If you are on a live network you can reimport the core contract using the following command

```javascript
core = await TokenCore.at("0x.......")
```

Otherwise, you will have to replay the following steps from the [token creation tutorial](./01-TokenCreation.md)
```javascript
core = await TokenCore.new('My Token Core', [ accounts[0] ])
```

Let's now create and configure a different delegate:
```javascript
delegate = await TokenDelegate.new()
core.defineTokenDelegate(2, delegate.address, [1, 2])
token = await TokenProxy.new(core.address)
await core.defineToken(token.address, 2, "My Token", "MTK", 18)
supply = "42" + "0".padEnd(18, "0")
await core.mint(token.address, [ accounts[0] ], [ supply ])
```

### Steps

##### 1- Test transferability

```javascript
token.canTransfer(accounts[0], accounts[1], "1000000000").then((x) => x.toString())
```

If the transfer can be executed, the result should be 1.
Other transfer code are defined in the [TokenStorage](../token/contracts/interface/ITokenStorage.sol) interface.

You can try for example to send to many tokens as below
```javascript
token.canTransfer(accounts[0], accounts[1], "1000" + "0".padEnd(18, "0")).then((x) => x.toString())
```
It should returns 4 (insufficient tokens)

##### 2- Freezing an address

Let's start by sending some tokens to a friend:
```javascript
token.transfer(accounts[1], 10000)
```

It should be able to send some tokens back now
```javascript
token.canTransfer(accounts[1], accounts[0], "1000").then((x) => x.toString())
```

Let's freeze his address for 5 years
```javascript
until = new Date("2025-01-01").getTime()/1000
core.freezeManyAddresses(token.address, [ accounts[1] ], until)
```

The following commands should both return 6 (addresses frozen):
```javascript
token.canTransfer(accounts[0], accounts[1], 1).then((x) => x.toString())
token.canTransfer(accounts[1], accounts[0], 1).then((x) => x.toString())
```

And the following should both return 1 as neither accounts[0] or accounts[2] are frozen:
```javascript
token.canTransfer(accounts[0], accounts[2], 1).then((x) => x.toString())
token.canTransfer(accounts[2], accounts[0], 1).then((x) => x.toString())
```

And a tranfer should fail. Optionnaly truffle might reports you with the following error ["CO03"](../common/contracts/core/Core.sol#L17)
```javascript
token.transfer(accounts[0 ], 1, { from: accounts[1] })
```

##### 3- Locking the token

Sometime, it's not about a specific address but rather the token which need to be locked.

The following command will let you lock the token for one day
```javascript
start = Math.floor(new Date().getTime()/1000)
end = start + 3600 * 24
core.defineLock(token.address, start, end, [])
```
The last parameter can be an array of exception addresses which still need to be allowed to transfer.
This can be either the compliance oracle addresses or a tokensale address.

The following commands should both return 5 (token locked):
```javascript
token.canTransfer(accounts[0], accounts[2], 1).then((x) => x.toString())
```

And a tranfer should fail. Optionnaly truffle might reports you with the following error ["CO03"](../common/contracts/core/Core.sol#L17)
```javascript
token.transfer(accounts[0], 1, { from: accounts[2] })
```

##### 4- Seize tokens

Although we froze our friend and we locked the token, we can still recover our tokens.
To do that we need to seize it with the following commands:

```javascript
core.seize(token.address, accounts[1], 1000)
```

We should have retrieve all our tokens back:
```javascript
token.balanceOf(accounts[0]).then((val) => val.toString())
token.balanceOf(accounts[1]).then((val) => val.toString())
```

You should be able by now to handle most compliance requirements
