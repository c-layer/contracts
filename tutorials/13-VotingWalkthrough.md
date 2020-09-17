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

After cloning the contracts repository, start the truffle docker using the `start.sh` script in the contracts directory.
It will start the image from the contracts directory and mount this directory into the container.

You will get a bash prompt inside the container. All the instructions from this tutorial should then to be executed from this environment.

### Module installation
Let's first make sure that all required modules are installed and compile all the contracts:
```
bash-5.0$ yarn clean && yarn install && yarn compile
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
core = await TokenCore.new('TokenCore', [ accounts[0] ])
delegate = await TokenDelegate.new()
```

```
core.defineTokenDelegate(1, delegate.address, [0,1])
token = await TokenProxy.new(core.address)
```

```
await core.defineToken(token.address, 1, "Token", "TKN", "18")
await core.mint(token.address, [accounts[0], accounts[1]], ['1000','500'])
```

So far so good? We have just created a new `TKN` token and minted a few tokens for `accounts[0]` and `accounts[1]`. Let's double check:
```
token.totalSupply().then(x => x.toString())
token.balanceOf(accounts[0]).then(x => x.toString())
token.balanceOf(accounts[1]).then(x => x.toString())
```

### Setup of a new voting contract 
A new voting session can be created using the `VotingSession` contract. A voting session will be made of several session instances, so do not get confused by the name of the contract. In the rest of this tutorial, the VotingSession contract will be referred to as the "voting contract" and the voting session instances will be referred to as the "voting sessions".
```
session = await VotingSession.new(token.address) 
```

The voting contract needs to be granted sufficient permissions to operate the token, so it can lock the tokens during the voting period. We will grant the 'AllPriviledges' role to the voting contract for the token (the privileges topic is covered in more details in another tutorial):
```
ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
core.assignProxyOperators(token.address, ALL_PRIVILEGES, [ session.address ]);
```

Each voting session will go through the following states:
- 0: PLANNED, a new session is planned and proposals can be submitted
- 1: CAMPAIGN, proposals can not be submitted anymore, poeple can promote their proposals
- 2: VOTING, votes can be submitted
- 3: REVEAL, votes can be revealed if they were submitted secretely 
- 4: GRACE, proposals can be executed
- 5: CLOSED

By default, a voting session will last 2 weeks. As we do not want the tutorial to last 2 weeks, we can change these values with the following parameters (feel free to modify those values):
- campaign period of 5 minutes
- voting period of 5 minutes
- reveal period of 0 minutes (no secret votes)
- grace period of 10 minutes
- maximum of 100 proposals for each voting session
- maximum of 255 proposals that can be submitted by the quaestor
- requirement to have a minimum of 10 tokens to be able to submit proposals
- requirement to have a minimum of 10 tokens to be able to execute proposals
```
session.updateSessionRule(5*60, 5*60, 0, 10*60, 100, 255, 10, 10)
```
So now it is possible to schedule a new voting session every 15 minutes. 


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
We can get the id of the current voting session using the sessions count function:
```
session.sessionsCount().then(x => x.toString())
 ```
This returns "1" as a new voting session has been dynamically created when we submitted our proposal. 

Let's check where we are with session 1:
```
session.sessionStateAt(1,Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```
This returns "0", indicating that the session is in the PLANNED stage.
After a few minutes, "1" will be returned instead, indicating that the voting session is in the CAMPAIGN state.

The length of the voting sessions being 15 minutes, the next voting session will start with the next quarter (e.g. if you submitted the proposal at 9:03, the next vote will start at 9:15).

We can double check by querying the session:
```
await session.session(1).then(x => new Date(x.startAt*1000))
```


### Modify the proposal
Until the CAMPAIGN period starts, it is still possible to update the proposal:
```
session.updateProposal(0, "mint", "Better description URL", "0x".padEnd(66,"0"), core.address, request)  
```
We can check that the proposal has been properly updated:
```
session.proposal(0)
```


### Voting 
When the VOTING period begins, we can simulate a vote from account[1] for the proposal:
```
session.submitVote([true], {from: accounts[1]})
```
Note here that we used an Array of booleans to submit our vote, indicating our voting decision for every proposal. 

We can check if the proposal has been approved:
```
session.isApproved(0)
```
The proposal is not approved, as accounts[1] only holds 1/3 of the tokens.

Let's simulate a new vote supporting the proposal from accounts[0] and check that the proposal is then approved:
```
session.submitVote([true])
session.isApproved(0)
```


### Execution of the proposal
When the VOTING period is closed (in our case 5 minutes after it began), the session state will enter the GRACE period:
```
session.sessionStateAt(1,Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```

Anyone who owns enought tokens (10 tokens in our case)  may now trigger the execution of the approved resolutions, including people who did not participate to the vote:
```
session.executeResolution(0, {from: accounts[1]})
```

Let's verify that the new tokens have been minted:
```
token.totalSupply().then(x => x.toString())
token.balanceOf(accounts[2]).then(x => x.toString())
```

