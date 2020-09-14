# Voting Resolution Requirements

### Goal
The objective of this tutorial is to illustrate the use of resolution requirements in the context of a voting contract.

We will guide you through the following steps:
- deploy a Token
- deploy a Voting Session contract
- define resolution requirements for the Voting Session
- validate the resolution requirements with 3 proposals

Before executing this tutorial, you should have completed the "Voting Walkthrough" tutorial which gives you the basics of how the voting contract works.

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
bash-5.0$ yarn clean && yarn install && yarn compile
```

### Truffle initialisation
Let's start `truffle` from the governance module
```bash
bash-5.0$ cd governance && truffle develop
truffle(develop)> 
```
  
### Token creation
First things first! Let's create a core, a token, and mint a a few tokens:
```javascript
core = await TokenCore.new('TokenCore', [ accounts[0] ])
delegate = await TokenDelegate.new()
core.defineTokenDelegate(1, delegate.address, [0,1])
token = await TokenProxy.new(core.address)
await core.defineToken(token.address, 1, "Token", "TKN", "18")
await core.mint(token.address, [accounts[0], accounts[1]], ['1000','500'])
```

### Creation of a new voting contract 
```
session = await VotingSession.new(token.address) 
```

Let's change the voting session parameters (feel free to change these values if it is too fast or too slow for you):
- campaign period of 1 minute
- voting period of 3 minutes
- reveal period of 0 minutes (no secret votes)
- grace period of 1 minutes
- maximum of 100 proposals for each voting session
- maximum of 255 proposals that can be submitted by the quaestor
- requirement to have a minimum of 10 tokens to be able to submit proposals
- requirement to have a minimum of 50 tokens to be able to execute proposals
```
session.updateSessionRule(1*60, 3*60, 0, 1*60, 100, 255, 10, 50)
```
So it is now possible to schedule a new voting session every 5 minutes. 

The voting contract also needs to be granted sufficient permissions to operate the token (we will not enter into the details here, the privileges  topic being covered in another tutorial):
```
ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
core.assignProxyOperators(token.address, ALL_PRIVILEGES, [ session.address ]);
```



### Definition of the resolution requirements
By default, the voting session simply inherits the default quorum and majority requirements. 
Proposals can be made on "anything". In other words, the voting contract will try to exectue whatever resolution has been adopted. While this might sounds great from a democratic perspective, there are certain actions that we might want to provent. 

In this example, we will configure some resolution requirements so that:
- the voting contract can not call any function from the core
- the minting of new tokens is subject to an 80% majority over a 90% quorum
- all other voting resolutions follow the default requirements (50% majority, 40% quorum)

To implement these rules, we use the `updateResolutionRequirements` function. This function takes as input multiple arrays (the size of the arrays being the number of resolution requirements). The arrays must contain:
- the address of the target
- the signature of the target's method
- the required majority
- the required quorum

```
minting_signature = core.abi.filter((method) => method.name === 'mint').map((method) => method.signature)[0]; 
ANY_METHODS = web3.utils.fromAscii('AnyMethods').padEnd(10, '0');
await session.updateResolutionRequirements( [core.address, core.address],
 [ANY_METHODS, minting_signature], ['200', '80'], ['200', '90'])
```
To prevent any function of the core from being called, we have set a majority and quorum higher than 100% for all the methods using the `ANY_METHODS` special value. Also note that the second rule is more granular to the previous one and will therefore have precedence over it.


### Submit proposals
We will validate that the resolution requirements work as expected by making the following proposals:
- 1. take the team to the restaurant. This proposal will not trigger the execution of any smart contract and will be adopted if a 50/60 majority/quorum is reached 
- 2. mint 500 new tokens for accounts[2]
- 3. assign accounts[4] the role of proxy operator so he can do whatever he wants with the token

```
proposal2_action = core.contract.methods.mint(token.address, [accounts[2]], ['500']).encodeABI()
proposal3_action = core.contract.methods.assignProxyOperators(token.address, ALL_PRIVILEGES, [ accounts[4] ]).encodeABI();
```

We can now submit these proposals:
```
session.defineProposal("proposal1", "URL of a nice restaurant", "0x".padEnd(66,"0"), "0x".padEnd(42,"0"), "0x")  
session.defineProposal("proposal2", "URL explaining why accounts[2] is a great guy", "0x".padEnd(66,"0"), core.address, proposal2_action)  
session.defineProposal("proposal3", "URL explaining why accounts[3] is an even better guy", "0x".padEnd(66,"0"), core.address, proposal3_action)  
```

### Voting 
Let's wait for the voting period to begin:
```
session.sessionStateAt(1,Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```

When the VOTING period begins, we can simulate a vote from account[0]:
```
session.submitVote([true, true, true], {from: accounts[0]})
```

We can check if the proposals have been approved:
```
session.isApproved(0)
session.isApproved(1)
session.isApproved(2)
```

accounts[0] holds 2/3 of the tokens. His single vote was sufficient to validate the 1st proposal (the team will go to a nice restaurant, yeah!), but not sufficient to validate the 2 other proposals.

Let's simulate a new vote supporting the proposal from accounts[1] and check what happened:
```
session.submitVote([true, true, true], {from: accounts[1]})
```

We can check if the proposals have been approved:
```
session.isApproved(0)
session.isApproved(1)
session.isApproved(2)
```

We can see that proposal 2 has been approved. However, proposal 3 could not be approved.


### Clean-up
Exit from the container and delete it:
```
docker rm -f clayer
```
  
