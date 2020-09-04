# Voting Walkthrough

### Goal
This tutorial will show you how to create a Voting Session for a specific Token and give you an overview of the voting process.

We will guide you through the following steps:
- deploy a Token
- deploy a Voting Session contract
- submit a proposal for minting new tokens
- go through all the steps of the voting session

### Environment setup
This tutorial has been validated with a Truffle installation running in the sirhill/truffle docker image. However, the same steps can be followed in a different environment. See [requirements](./Tutorials.md#requirements) for more details.

After cloning the contracts repository, start the truffle docker image form the contracts directory directly and mount this directory to the container:
```
docker run --name clayer -it \
-p 33000:3000 -p 33001:3001 -p 8080:8080 \
-p 8545:8545 -p 9545:9545 \
-v $PWD:/home/node/project \
sirhill/truffle
```

You should get a bash prompt inside the container. All the instructions from this tutorial should to be executed from this environment.

### Module installation
Let's first make sure that all required modules are installed and compile all the contracts:
```
bash-5.0$ yarn clean
bash-5.0$ yarn install
bash-5.0$ yarn compile
```

### Truffle initialisation

Let's start `truffle` from the governance module
```bash
bash-5.0$ cd governance && truffle develop
truffle(develop)> 
```
  
### Token creation

First things first! We need a new Token to play with. Here we are simply repeating the main steps from the [token creation tutorial](./01-TokenCreation.md)
```javascript
core = await TokenCore.new('Token Core for Voting Tutorial', [ accounts[0] ])
delegate = await TokenDelegate.new()
core.defineTokenDelegate(1, delegate.address, [0,1])
token = await TokenProxy.new(core.address)
await core.defineToken(token.address, 1, "VotingToken", "VOTE", "18")
await core.mint(token.address, [accounts[0], accounts[1]], ['1000','500'])
```

So far so good? We have just created a new `VOTE` token and minted a few tokens for `accounts[0]` and `account[1]`. Let's double check:
```javascript
token.totalSupply().then(x => x.toString())
token.balanceOf(accounts[0]).then(x => x.toString())
token.balanceOf(accounts[1]).then(x => x.toString())
```

### Setup of a new voting contract 
In production, voting sessions should be created using the `VotingSession` contract. Here we are using the `VotingSessionMock` contract instead so we can simulate the progression of the voting session over time:
```
session = await VotingSessionMock.new(token.address) 
```

The voting contract needs to be granted sufficient permissions to operate the token (we will not enter into the details here, the privileges  topic being covered in another tutorial):
```
ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
core.assignProxyOperators(token.address, ALL_PRIVILEGES, [ session.address ]);
```

### Submit a proposal 
Let's assume that our proposal consists in minting 500 new tokens for accounts[2]. We first need to encode this request: 
```
request = core.contract.methods.mint(token.address, [accounts[2]], ['500']).encodeABI()
```

We can now submit this proposal. We will use the defineProposal function that takes as parameters:
- the name of the proposal
- a URL describing the proposal
- a checksum of the URL content
- the SmartContract to call 
- the encoded request to submit to the Smart Contract
```
session.defineProposal("mint", "Description URL", "0x".padEnd(66,"0"), core.address, request)  
```

### Inspect the current voting session 

We can get the number of voting sessions using this function:
```
session.sessionsCount().then(x => x.toString())
 ```
This returns "1" as a new voting session has been dynamically created when we submitted our proposal. 

Each voting session will go through the following states:
- 0: PLANNED,
- 1: CAMPAIGN,
- 2: VOTING,
- 3: REVEAL,
- 4: GRACE,
- 5: CLOSED

Let's check where we are with session 0:
```
session.sessionStateAt(0,Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```
This returns "0", indicating that the session is 0 is now planned.

We can also check if our proposal is approved:
```
session.isApproved(0)
```

### Voting 

By default, the voting contract uses a majority of 50% and a quorum of 40%. 

Let's move the session state to "VOTING" and vote for the proposal as account[0]:
```
session.nextSessionStepTest()
session.nextSessionStepTest()
session.submitVote([true])
```
Note here that we used an Array of booleans to submit our vote. 

We can verify that the first proposal has been approved:
```
session.isApproved(0)
```

### Execution of the proposal
Let's move the session state to "GRACE" and execute the proposal. 
```
session.nextSessionStepTest()
session.nextSessionStepTest()
session.executeResolution(0)
```

We can verify that the new tokens have been minted:
```
token.totalSupply().then(x => x.toString())
token.balanceOf(accounts[2]).then(x => x.toString())
```

### Clean-up
Exit from the container and delete it:
```
docker rm -f clayer
```
  
