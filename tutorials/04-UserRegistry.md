
# User Registry

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a user registry and learn how to manage it.

### Start

##### 1- Go into the oracle module and start truffle
```bash
cd oracle && yarn develop
```

##### 2- Load definitions

You shall to load the definitions needed for this tutorial:

```javascript
accounts = await web3.eth.getAccounts()

UserRegistry = await artifacts.require('UserRegistry')
```

### Steps

##### 3- Create a user registry

Let's create a user registry with a base currency in CHF.
The registry will includes the n users from the accounts array.
And the users will be valid until the 2025-01-01.

```javascript
users = await UserRegistry.new("My User Registry", web3.utils.fromAscii("CHF"), accounts, new Date("2025-01-01").getTime() / 1000)
users.address
```

If your user registry contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

You may then check for the user count
```javascript
await users.userCount().then((val) => val.toString())
```

The first user id is 1 as 0 is considered in solidity as undefined.
User id are then incremented. Therefore, the last user id is equal to the user count.

You may retrieve the validity for any users
```javascript
await users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

You may also look at the different available methods on the user registry
```javascript
Object.keys(users.methods)
```

##### 4- Register another user

You can add a new user through the following command. Replace the "0x....." with an address not already attributed to an existing user (ie from ```accounts```)
```javascript
address = "0x......."
await users.registerUser(address, new Date("2025-01-01").getTime() / 1000)
```

You may then check again for the user count
```javascript
await users.userCount().then((val) => val.toString())
```

You may also retrieve the validity for this user
```javascript
await users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

You can also request the valid user id for that user
```javascript
await users.validUserId(address).then((x) => x.toString())
```

##### 3- Suspend a user

The following command will suspend the user 2.
```javascript
await users.suspendUser(2)
```
If you now try to retrieve the validity for this user, it will keep its validity end date but will return suspended
```javascript
await users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

You can also request the valid user id for that user
```javascript
await users.validUserId(accounts[1]).then((x) => x.toString())
```
A user is valid when it is not suspended and the validity date is in the future.
`validUser()` will return the userId if the user exists and is valid, 0 otherwise.

If you want to restore the user after, you can execute
```javascript
await users.restoreUser(2)
```

The userId should be valid again.

##### 4- Attach and Detach address to a user

Multiple addresses may be attached to a single user.
An address can only be attached to one user.

Let's detach the new address as follows:
```javascript
await users.detachAddress(address)
```

In order to attach addresses, you may proceed as follows:
```javascript
await users.attachAddress(1, address)
```

You may then retrieve the user id for that new address
```javascript
await users.userId(address)
```

##### 5- Extended keys

The user registry allows you to tag users with some attribute.
The attributes must be either quantified or normalized as it must be stored as a number.
The default value will be 0.

By convention,
- key 0 is the KYC_LIMIT_KEY (0-5),
- key 1 is the RECEPTION_LIMIT_KEY (amount),
- key 2 is EMISSION_LIMIT_KEY (amount)

To display the available keys in the registry, you may use the command below:
```javascript
await users.extendedKeys().then((val) => val.toString())
```

You can then query the key 1 for the user 2 with the command below:
```javascript
await users.extended(2, 1).then((val) => val.toString())
```

To update the key 1 for the user 2 to 1000, you can execute:
```javascript
await users.updateUserExtended(2, 1, 1000)
```

You can then query again the key 1 for the user 2 to verify the updated value:
```javascript
await users.extended(2, 1).then((val) => val.toString())
```

The end of the tutorial for the user registry.
