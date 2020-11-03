# Running a DAO

### Goal
This tutorial will show you how to create an election process to choose a quaestor that will be in charge of setting new voting rules.
We will reuse the Voting Session Manager from the previous tutorial and go further with it.

We will guide you through the following steps:
- deploy contracts: a Token and a VotingSessionManager
- define a role for the quaestor
- create 3 different candidates
- go through all the steps of the voting session
- change the rules

Participants could have perfectly voted to change the rules directly instead of electing a quaestor.
This is shown as an example to vote for a temporary authority which may have other privileges as well.

### Environment setup
This tutorial has been validated with a Truffle installation running in the sirhill/truffle docker image. However, the same steps can be followed in a different environment. See [requirements](./Tutorials.md#requirements) for more details.

After cloning the contracts repository, start the truffle docker using the `start.sh` script in the contracts directory.
It will start the image from the contracts directory and mount this directory into the container.

You will get a bash prompt inside the container. All the instructions from this tutorial should then be executed from this environment.

### Module installation
Let's first make sure that all required modules are installed and let's compile all the contracts:
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
A new voting session manager can be created using the `VotingSessionManager` contract. This contract will manage periodic voting session instances. In the rest of this tutorial, the VotingSessionManager contract will be referred to as the "voting contract" and the voting session instances will be referred to as the "voting sessions".
```
votingDelegate = await VotingSessionDelegate.new()
voting = await VotingSessionManager.new(token.address, votingDelegate.address) 
```

The voting contract needs its own lock to prevent tokens transfer during the voting period. We create one when defining a proxy with a Lockable Delegate:

```
core.defineProxy(voting.address, 1);
```

We can the assign the newly created lock to the token
```
core.defineTokenLocks(token.address, [token.address, voting.address]);
```

Then the voting contract needs to be granted sufficient permissions to operate its lock. We will grant the 'AllPriviledges' role to the voting contract for itself (the privileges topic is covered in more details in another tutorial):
```
ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
core.assignOperators(ALL_PRIVILEGES, [ voting.address ])
core.assignProxyOperators(voting.address, ALL_PRIVILEGES, [ voting.address ]);
```

As we will try to mint more tokens through the voting contract, we need to provide the voting contract with some privileges on the token. Let's reuse the same command:
```
core.assignProxyOperators(token.address, ALL_PRIVILEGES, [ voting.address ]);
```

We can update the voting session rules to have a voting session every 20 minutes:
```
voting.updateSessionRule(5*60, 5*60, 5*60, 10*60, 0, 10, 20, 25, 1, [])
```
You may check the previous tutorial to see the details of these parameters. Check the [rules configuration](./13-VotingWalkthrough.md#configure-the-rules) for more

Finally, we need to design a QUAESTOR role that we want the elected quaestor to have.
```
QUAESTOR_PRIVILEGES = VotingSessionManager.abi.filter((method) => method.name === 'defineContracts' || method.name === 'updateResolutionRequirements' || method.name === 'updateSessionRule').map((method) => method.signature)
QUAESTOR_ROLE = web3.utils.fromAscii('Quaestor').padEnd(66, '0')
```

### Submit proposals

In our cases, we need to first make a proposal to define the new QUAESTOR role with the chosen privileges:
```
request1 = core.contract.methods.defineRole(QUAESTOR_ROLE, QUAESTOR_PRIVILEGES).encodeABI()
voting.defineProposal("Defining Quaestor Role", "Description URL", "0x".padEnd(66,"0"), core.address, request1, 0, 0)  
```

We want now to have a first candidate for this role:
```
request2 = core.contract.methods.assignProxyOperators(voting.address, QUAESTOR_ROLE, [accounts[0]]).encodeABI()
voting.defineProposal("Account0 for quaestor", "Description URL", "0x".padEnd(66,"0"), core.address, request2, 0, 0)
```

We've just created the proposal with `proposalId = 2`. We will reference it for other candidates as we want to compete with this proposal.
Let's go now with our second and third candidates:
```
request3 = core.contract.methods.assignProxyOperators(voting.address, QUAESTOR_ROLE, [accounts[1]]).encodeABI()
voting.defineProposal("Account1 for quaestor", "Description URL", "0x".padEnd(66,"0"), core.address, request3, 2, 0, { from: accounts[1] })

request4 = core.contract.methods.assignProxyOperators(voting.address, QUAESTOR_ROLE, [accounts[2]]).encodeABI()
voting.defineProposal("Account2 for quaestor", "Description URL", "0x".padEnd(66,"0"), core.address, request4, 2, 0, { from: accounts[1] })
```

The two last proposals reference the proposalId 2 within their last parameters.
It will be required during the vote that voters for for no more than one of these candidates.


### Voting 
When the VOTING period begins, we can vote as account 1 for the proposal.
To check, we are indeed in the VOTING period, the follow command should return '3' (VOTING).
```
voting.sessionStateAt(1, Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```

You will need to wait a few minutes if you are still in 1-PLANNED or 2-CAMPAIGN.
```
voting.session(1).then((x) => new Date(1000 * x.voteAt))
```
If the state is greater than '3', you will have to wait until the session went at 5-GRACE or later to start over.


Let's get back to our vote.
The first participant will vote for the definition of the QUAESTOR role, and for himself as the quaestor.
The vote value is passed under the form of a bitmap provided as an integer.
The vote for the first and third proposal correspond to ```2**0 + 2**2 = 5```

```
voting.submitVote(5, {from: accounts[1]})
```

You may want to experiment and verify that account 0 may not vote for more than one candidate.
Voting for candidate 1 and 3 is therefore impossible: ```2**0 + 2**1 + 2**3 = 11```
The following command will be rejected with the relevant error code.
```
voting.submitVote.estimateGas(11})
```

The account 0 will indeed now vote for the role and himself: ```2**0 + 2**1 = 3```
```
voting.submitVote(3)
```

### Execution of the proposal
When the 3-VOTING period is closed (in our case 5 minutes after it began), the session state will enter the 4-EXECUTION period:
```
voting.sessionStateAt(1, Math.floor((new Date()).getTime()/1000)).then(x => x.toString())
```

Once in EXECUTION, the proposal state will confirmed proposals which have been APPROVED:
```
Promise.all([1, 2, 3, 4].map((i) => voting.proposalStateAt(1, i, Math.floor((new Date()).getTime()/1000)).then(x => x.toString())))
```

The result should be ```[ '4', '4', '5', '5' ]``` with the 4-APPROVED and 5-REJECTED
Hence, the proposals 1 and 2 have been approved. The 3 was rejected.
Let's execute the two approved proposals:

```
voting.executeResolutions([1, 2]);
```

Replaying the command before will confirm us thaat the resolutions were successfully executed.
```
Promise.all([1, 2].map((i) => voting.proposalStateAt(1, i, Math.floor((new Date()).getTime()/1000)).then(x => x.toString())))
```
The two proposals are now in 6-RESOLVED.

### Congratulations!

Let's verify that our account is now the newly executed quaestor!
```
core.proxyRole(voting.address, accounts[0]).then((x) => web3.utils.toAscii(x).replace(/(\u0000)+/, ''))
```

After the EXECUTION period, the QUAESTOR may change the rules at any time:
```
voting.updateSessionRule('300', '300', '300', '600', 0, 10, 20, 25, 1000, [ accounts[1] ])
```

If you kept the parameters in the previous command, I let you think if that was really a smart first move as the QUAESTOR! ;-)

