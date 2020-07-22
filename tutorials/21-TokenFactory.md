
# Running a Token Factory

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

You should also have created a token. See the first tutorial [here](./01-TokenCreation.md) if needed.

### Goals

This tutorial will guide you how to setup and operate a token factory.

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

Otherwise, you will have to replay the following step from the [token creation tutorial](./01-TokenCreation.md)

```javascript
core = await TokenCore.new('My Token Core', [ accounts[0] ])
```

In both cases, you will need to define the following delegate

```javascript
delegate = await TokenDelegate.new()
await core.defineTokenDelegate(2, delegate.address, [0, 1])
```

### Steps

##### 1- Setup a token factory

First, you will nedd to create the factory as follow

```javascript
    factory = await TokenFactory.new()
```

Second, you need to configure the factory with the token proxy code that will be used to create token

```javascript
    await factory.defineProxyCode(TokenProxy.bytecode)
```

if you need to double check which code is configured, you can use the following commands to get the hash of the bytecode

```javascript
    const expectedCodeHash = web3.utils.sha3(TokenProxy.bytecode)
    foundCodeHash = await factory.contractCode(0).then((bytecode) => web3.utils.sha3(bytecode))

    expectedCodeHash == web3.utils.sha3(TokenProxy.bytecode)
```

And finally, the factory need to have the proper role access configured on the core.

The following command let you check if the factory has access to the core:

```javascript
   await factory.hasCoreAccess(core.address)
```

The factory is required to have access to the following core level and proxy level privileges.
The proxy level privilege need to apply on all proxies.

```javascript
    ALL_PROXIES = web3.utils.toChecksumAddress('0x' + web3.utils.fromAscii('AllProxies').substr(2).padStart(40, '0'))

    FACTORY_CORE_ROLE = web3.utils.fromAscii('FactoryCoreRole').padEnd(66, '0')
    FACTORY_PROXY_ROLE = web3.utils.fromAscii('FactoryProxyRole').padEnd(66, '0')

    REQUIRED_CORE_PRIVILEGES = [ 'assignProxyOperators(address,bytes32,address[])', 'defineToken(address,uint256,string,string,uint256)' ].map((x) => web3.utils.sha3(x).substr(0, 10))
    REQUIRED_PROXY_PRIVILEGES = [ 'mint(address,address[],uint256[])', 'finishMinting(address)', 'defineLock(address,uint256,uint256,address[])', 'defineRules(address,address[])' ].map((x) => web3.utils.sha3(x).substr(0, 10))
```

To configure the core with these privileges, proceed as follow:

```javascript
    await core.defineRole(FACTORY_CORE_ROLE, REQUIRED_CORE_PRIVILEGES)
    await core.assignOperators(FACTORY_CORE_ROLE, [factory.address])
    await core.defineRole(FACTORY_PROXY_ROLE, REQUIRED_PROXY_PRIVILEGES)
    await core.assignProxyOperators(ALL_PROXIES, FACTORY_PROXY_ROLE, [factory.address])
```

Hence, the factory will have both roles `FACTOR_CORE_ROLE` and `FACTORY_PROXY_ROLE`.
The proxy privileges will be applicable on all the proxies configured on the core.

Now, you may want to check again that the factory has access to the core.
It shouldd be true.

```javascript
   await factory.hasCoreAccess(core.address)
```

##### 2- Deploy a token through the factory

Once you factory is configured, you are free to proceed and deploy a token.


```javascript
    NAME = 'My Token'
    SYMBOL = 'MTN'
    DECIMALS = '18'
    VAULTS = [ accounts[2], accounts[3] ]
    SUPPLIES = [ '1000', '42' ].map((value) => (value + ''.padEnd(18, '0')))
    ISSUERS = [ accounts[0] ]
    
    tx = await factory.deployToken(core.address, 1, NAME, SYMBOL, DECIMALS, 0, true, VAULTS, SUPPLIES, ISSUERS)
```

If the deployment was successfull, you will find the deployed token address can be then found in the log:

```javascript
   tx.logs[1].args.token
```

You can then load the token in your truffle environment as below.

```javascript
   token = await TokenProxy.at(tx.logs[1].args.token)
```

Then you may check that the token was properly minted.

```javascript
   await token.totalSupply().then((value) => value.toString())
   await Promise.all([ accounts[2], accounts[3] ].map((account) => token.balanceOf(account).then((value) => value.toString())))
```

The token should not be transferable and canTransfer should return 7.

```javascript
   await token.canTransfer(accounts[2], accounts[0], 1).then((value) => value.toString())
```

As everyone is free to use the factory, there is a rule which prevent the token to be immediatly transferrable upon deployment.
Core compliance operator may review and approve the token as follow.
Please note, that a token without compliance (and or no rule engine) will be directly usable. If this is the case, then thhe token delegate configuration should be made in a way that it does not impact existing token.

```javascript
   await factory.approveToken(core.address, token.address)
```

And now the token should be freely usable and the command below will return 0.

```javascript
   await token.canTransfer(accounts[2], accounts[0], 1).then((value) => value.toString())
```

If the token were to not be approved, it may also be removed from the core as follow.

```javascript
   tx = await factory.deployToken(core.address, 2, 'InvalidToken', 'ITN', 18, 0, true, [ accounts[0] ], [ '100' + ''.padEnd(18, '0') ], [ accounts[0] ])
   tokenToRemoved = await TokenProxy.at(await tx.logs[1].args.token)
   await core.removeToken(tokenToRemoved.address)
```

Well done! You have successfully deployed your first token using the factory.

