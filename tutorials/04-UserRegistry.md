
# User Registry

### Requirements

Your environment is setup as described [here](https://github.com/c-layer/contracts/blob/tutorials/tutorials/Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a user registry and learn how to manage it.

### Start

You must start `truffle` from the *c-layer-oracle* module
```bash
  cd c-layer-oracle && truffle develop
```

### Steps

##### 1- Create a user registry

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
users.userCount().then((x) => x.toString())
```

The first user id is 1 as 0 is considered in solidity as undefined.
User id are then incremented. Therefore, the last user id is equal to the user count.

You may retrieve the validity for any users
```javascript
users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

You may also look at the different available methods on the user registry
```javascript
Object.keys(users.methods)
```

##### 2- Register another user

You can add a new user through the following command. Replace the "0x....." with an address not already attributed to an existing user (ie from ```accounts```)
```javascript
address = "0x......."
users.registerUser(address, new Date("2025-01-01").getTime() / 1000)
```

You may then check again for the user count
```javascript
users.userCount().then((x) => x.toString())
```

And you may also retrieve the validity for this user
```javascript
users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

or 

You can also request the valid user id for that user
```javascript
users.validUserId(address).then((x) => x.toString())
```

##### 3- Suspend a user

The following command will suspend the user 2.
```javascript
users.suspendUser(2)
```
If you now try to retrieve the validity for this user, it will keep its validity end date but will return suspended
```javascript
users.validity(2).then((x) => new Date(x[0]*1000) + ", suspended: " + x[1])
```

You can also request the valid user id for that user
```javascript
users.validUserId(accounts[1]).then((x) => x.toString())
```
A user is valid when it is not suspended and the validity date is in the future.
`validUser()` will return the userId if the user exists and is valid, 0 otherwise.

If you want to restore the user after, you can execute
```javascript
users.restoreUser(2)
```

The userId should be valid again.

##### 4- Attach and Detach address to a user

Multiple addresses may be attached to a single user.
An address can only be attached to one user.

In order to attach addresses, you may proceed as follow:
```javascript
address = "0x...."
users.attachAddress(1, address)
```

You may then retrieve the user id for that new address
```javascript
users.userId(1)
```

You can also detach an address on the same principle
```javascript
users.detachAddress(1, address)
```

##### 5- Extended keys

The user registry allows you to tag users with some attribute.
The attributes must be either quantified or normalized as it must be stored as a number.
The default value will be 0.

By convention,
- key 0 is the KYC_LIMIT_KEY (0-5),
- key 1 is the RECEPTION_LIMIT_KEY (amount),
- key 2 is EMISSION_LIMIT_KEY (amount)

To display the available keys in the registry, you may use the command below
```javascript
users.extendedKeys().then((x) => x.toString())
```

You can then query the keys for different users
```javascript
users.extended(1, 2).then((x) => x.toString())
```

To update the key 1 for the user 2 to 1000, you can execute:
```javascript
users.updateUserExtended(1, 1, 1000)
```

This end the tutorial for the user registry.
