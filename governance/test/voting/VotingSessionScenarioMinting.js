'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const TokenProxy = artifacts.require('mock/TokenProxyMock.sol');
const TokenDelegate = artifacts.require('mock/TokenDelegateMock.sol');
const TokenCore = artifacts.require('mock/TokenCoreMock.sol');
const VotingSessionDelegate = artifacts.require('voting/VotingSessionDelegate.sol');
const VotingSessionManagerMock = artifacts.require('mock/VotingSessionManagerMock.sol');

const ANY_TARGET = web3.utils.fromAscii('AnyTarget').padEnd(42, '0');
const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = '2';

const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));
const DAY_IN_SEC = 24 * 3600;
const Periods = {
  campaign: 5 * DAY_IN_SEC,
  voting: 2 * DAY_IN_SEC,
  execution: 1 * DAY_IN_SEC,
  grace: 6 * DAY_IN_SEC,
};
const OFFSET_PERIOD = 2 * DAY_IN_SEC;
const DEFAULT_PERIOD_LENGTH =
  Object.values(Periods).reduce((sum, elem) => sum + elem, 0);
const TODAY = Math.floor(new Date().getTime() / 1000);
const NEXT_VOTE_AT =
  (Math.floor((TODAY + Periods.campaign) /
    DEFAULT_PERIOD_LENGTH) + 1
  ) * DEFAULT_PERIOD_LENGTH + OFFSET_PERIOD;
const Times = {
  today: TODAY,
  campaign: NEXT_VOTE_AT - Periods.campaign,
  voting: NEXT_VOTE_AT,
  execution: NEXT_VOTE_AT + (Periods.voting),
  grace: NEXT_VOTE_AT + (Periods.voting + Periods.execution),
  closed: NEXT_VOTE_AT + (Periods.voting + Periods.execution + Periods.grace),
};
const SESSION_RETENTION_COUNT = 10;

const SessionState = {
  UNDEFINED: '0',
  PLANNED: '1',
  CAMPAIGN: '2',
  VOTING: '3',
  EXECUTION: '4',
  GRACE: '5',
  CLOSED: '6',
  ARCHIVED: '7',
};

const ProposalState = {
  UNDEFINED: '0',
  DEFINED: '1',
  CANCELLED: '2',
  LOCKED: '3',
  APPROVED: '4',
  REJECTED: '5',
  RESOLVED: '6',
  CLOSED: '7',
  ARCHIVED: '8',
};

contract('VotingSessionScenarioMinting', function (accounts) {
  let core, delegate, token, votingSession, votingDelegate;

  const recipients = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[5], accounts[6]];
  const supplies = ['100', '3500000', '1500000', '2000000', '1', '1000000'];

  const proposalName = 'Would you like to vote ?';
  const proposalHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const proposalUrl = 'http://url.url';

  before(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new('Test', [accounts[0], accounts[4]]);
    await core.defineTokenDelegate(1, delegate.address, [0, 1]);
    await core.manageSelf(true, { from: accounts[5] });

    votingDelegate = await VotingSessionDelegate.new();
  });

  beforeEach(async function () {
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.mint(token.address, recipients, supplies);

    votingSession = await VotingSessionManagerMock.new(token.address, votingDelegate.address);

    await core.defineProxy(votingSession.address, 1);
    await core.defineTokenLocks(token.address, [token.address, votingSession.address]);
    await core.assignProxyOperators(votingSession.address, ALL_PRIVILEGES, [votingSession.address]);
    await core.assignProxyOperators(token.address, ALL_PRIVILEGES, [votingSession.address]);
  });

  describe('with 4 proposals: blank and (mint or burn) and seize', function () {
    let request1, request2, request3;

    const MINT_MORE_TOKENS = 'Mint more tokens!';
    const BURN_THEM_ALL = 'Burn \'em all!';

    beforeEach(async function () {
      await votingSession.updateSessionRule(
        '432000', '172800', '86400', '518400', '172800', '5', '20', '25', '1', [accounts[6]]);

      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');

      request1 = core.contract.methods.mint(token.address, [accounts[4]], ['13999900']).encodeABI();
      await votingSession.defineProposal(
        MINT_MORE_TOKENS,
        proposalUrl,
        proposalHash,
        core.address,
        request1,
        '1',
        '0');

      request2 = core.contract.methods.burn(token.address, '1000000').encodeABI();
      await votingSession.defineProposal(
        BURN_THEM_ALL,
        proposalUrl,
        proposalHash,
        core.address,
        request2,
        '1',
        '2');

      request3 = core.contract.methods.seize(token.address, accounts[1], '3000001').encodeABI();
      await votingSession.defineProposal(
        'seize dat guy',
        proposalUrl,
        proposalHash,
        core.address,
        request3,
        '0',
        '0');
    });

    describe('during voting', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
      });

      it('should have a session state at VOTING', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.VOTING, 'session state');
      });

      it('should be possible to vote for a proposal', async function () {
        await votingSession.submitVote(4);
      });

      it('should be possible to vote on behalf', async function () {
        await votingSession.submitVotesOnBehalf([accounts[1], accounts[2]], 3);
      });

      it('should have the token locked', async function () {
        const lockData = await core.lock(votingSession.address, ANY_ADDRESSES, ANY_ADDRESSES);
        assert.equal(lockData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(lockData.endAt.toString(), Times.execution, 'lock end');
      });
    });

    describe('without enough votes for the quorum', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(11);
        await votingSession.submitVote(13, { from: accounts[5] });
        await votingSession.nextSessionStepTest(1);
      });

      it('should have a session state at EXECUTION', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.EXECUTION, 'session state');
      });

      it('should have a session', async function () {
        const session = await votingSession.session(1);
        assert.equal(session.proposalsCount.toString(), '4', 'proposalsCount');
        assert.equal(session.participation.toString(), '101', 'participation');
        assert.equal(session.totalSupply.toString(), '8000101', 'totalSupply');
        assert.equal(session.votingSupply.toString(), '7000101', 'votingSupply');
      });

      it('should have approvals for blank proposal', async function () {
        const proposal = await votingSession.proposalData(1, 1);
        assert.equal(proposal.approvals.toString(), '101', 'approvals');
      });

      it('should have approvals for mint proposal', async function () {
        const proposal = await votingSession.proposalData(1, 2);
        assert.equal(proposal.approvals.toString(), '100', 'approvals');
      });

      it('should have approvals for burn proposal', async function () {
        const proposal = await votingSession.proposalData(1, 3);
        assert.equal(proposal.approvals.toString(), '1', 'approvals');
      });

      it('should have approvals for seize proposal', async function () {
        const proposal = await votingSession.proposalData(1, 4);
        assert.equal(proposal.approvals.toString(), '101', 'approvals');
      });

      it('should have blank proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 1);
        assert.ok(!approved, 'rejected');
      });

      it('should have mint proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(!approved, 'rejected');
      });

      it('should have burn proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(!approved, 'rejected');
      });

      it('should have seize proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 4);
        assert.ok(!approved, 'rejected');
      });
    });

    describe('after sucessfull votes, during execution period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVotesOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 3);
        await votingSession.nextSessionStepTest(1);
      });

      it('should have a session state at EXECUTION', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.EXECUTION, 'session state');
      });

      it('should have a session', async function () {
        const session = await votingSession.session(1);
        assert.equal(session.proposalsCount.toString(), '4', 'proposalsCount');
        assert.equal(session.participation.toString(), '7000100', 'participation');
        assert.equal(session.totalSupply.toString(), '8000101', 'totalSupply');
        assert.equal(session.votingSupply.toString(), '7000101', 'votingSupply');
      });

      it('should have approvals for blank proposal', async function () {
        const proposal = await votingSession.proposalData(1, 1);
        assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
      });

      it('should have approvals for mint proposal', async function () {
        const proposal = await votingSession.proposalData(1, 2);
        assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
      });

      it('should have approvals for burn proposal', async function () {
        const proposal = await votingSession.proposalData(1, 3);
        assert.equal(proposal.approvals.toString(), '0', 'approvals');
      });

      it('should have approvals for seize proposal', async function () {
        const proposal = await votingSession.proposalData(1, 4);
        assert.equal(proposal.approvals.toString(), '0', 'approvals');
      });

      it('should have blank proposal approved', async function () {
        const approved = await votingSession.proposalApproval(1, 1);
        assert.ok(approved, 'approved');
      });

      it('should have mint proposal approved', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(approved, 'approved');
      });

      it('should have burn proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(!approved, 'rejected');
      });

      it('should have seize proposal rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 4);
        assert.ok(!approved, 'rejected');
      });

      it('should be possible to execute blank proposal', async function () {
        const tx = await votingSession.executeResolutions([1]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.proposalId.toString(), '1', 'proposal id');
      });

      it('should not be possible to execute mint before the blank proposal', async function () {
        await assertRevert(votingSession.executeResolutions([2]), 'VD30');
      });

      it('should execute many resolution', async function () {
        const tx = await votingSession.executeResolutions([1, 2]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.proposalId.toString(), '1', 'proposal id');
        assert.equal(tx.logs[1].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[1].args.proposalId.toString(), '2', 'proposal id');

        const totalSupply = await token.totalSupply();
        assert.equal(totalSupply.toString(), '22000001', 'totalSupply');
        const balance4 = await token.balanceOf(accounts[4]);
        assert.equal(balance4.toString(), '13999900', 'balance4');
      });

      it('should not be possible to execute seize proposal', async function () {
        await assertRevert(votingSession.executeResolutions([4]), 'VD29');
      });

      it('should not be possible to add a proposal', async function () {
        await assertRevert(votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '0'), 'VD11');
      });

      describe('during the grace period', function () {
        beforeEach(async function () {
          await votingSession.nextSessionStepTest(1);
        });

        it('should be possible to add a proposal', async function () {
          const tx = await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
          assert.equal(tx.logs[0].args.sessionId.toString(), '2', 'session id');
          assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
          assert.equal(tx.logs[1].args.sessionId.toString(), '2', 'session id');
          assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
        });
      });

      describe('with the next session planned', function () {
        beforeEach(async function () {
          await votingSession.nextSessionStepTest(1);
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
        });

        it('should have a first session state at GRACE', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const sessionState = await votingSession.sessionStateAt(1, now);
          assert.equal(sessionState.toString(), SessionState.GRACE, 'session state');
        });

        it('should have a second session state at PLANNED', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const sessionState = await votingSession.sessionStateAt(2, now);
          assert.equal(sessionState.toString(), SessionState.PLANNED, 'session state');
        });

        it('should not be possible to execute approved resolutions', async function () {
          await assertRevert(votingSession.executeResolutions([1, 2]), 'VD28');
        });

        describe('with the next session started', function () {
          beforeEach(async function () {
            await votingSession.nextStepTest(1);
          });

          it('should have a second session state at CLOSED', async function () {
            const now = Math.floor(new Date().getTime() / 1000);
            const sessionState = await votingSession.sessionStateAt(1, now);
            assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
          });

          it('should not be possible to execute approved resolution', async function () {
            await assertRevert(votingSession.executeResolutions([1]), 'VD25');
          });
        });
      });

      describe('after minting', function () {
        beforeEach(async function () {
          await votingSession.executeResolutions([1, 2]);
        });

        it('should have a first session state at EXECUTION', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const sessionState = await votingSession.sessionStateAt(1, now);
          assert.equal(sessionState.toString(), SessionState.EXECUTION, 'session state');
        });

        it('should have proposal state RESOLVED', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const state = await votingSession.proposalStateAt(1, 2, now);
          assert.equal(state.toString(), ProposalState.RESOLVED, 'state');
        });

        it('should have proposal executed', async function () {
          const proposal = await votingSession.proposalData(1, 2);
          assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
          assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
          assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
          assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
          assert.equal(proposal.dependsOn.toString(), '1', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '6', 'alternativesMask');
          assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
        });

        it('should not be possible to mint twice', async function () {
          await assertRevert(votingSession.executeResolutions([2]), 'VD29');
        });
      });
    });

    describe('after sucessfull votes, and after grace period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVotesOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 1);
        await votingSession.nextSessionStepTest(3);
      });

      it('should have a session state at CLOSED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
      });

      it('should not be possible to execute mint proposal anymore', async function () {
        await assertRevert(votingSession.executeResolutions([1]), 'VD25');
      });
    });

    describe('A year after the vote is closed', function () {
      beforeEach(async function () {
        await votingSession.historizeSessionTest();
      });

      it('should be possible to archive it', async function () {
        const tx = await votingSession.archiveSession();
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'SessionArchived', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
      });

      describe('With the oldest session archived', function () {
        beforeEach(async function () {
          await votingSession.archiveSession();
        });

        it('should have no oldest session', async function () {
          const oldestSessionId = await votingSession.oldestSessionId();
          assert.equal(oldestSessionId.toString(), '2', 'oldest session id');
        });

        it('should have no current session', async function () {
          const currentSessionId = await votingSession.currentSessionId();
          assert.equal(currentSessionId.toString(), '1', 'current session id');
        });

        it('should have a session state at ARCHIVED', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const sessionState = await votingSession.sessionStateAt(1, now);
          assert.equal(sessionState.toString(), SessionState.ARCHIVED, 'session state');
        });

        it('should have prooposal state at ARCHIVED', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const proposalState = await votingSession.proposalStateAt(1, 1, now);
          assert.equal(proposalState.toString(), ProposalState.ARCHIVED, 'proposal state');
        });
      });

      describe('After ' + SESSION_RETENTION_COUNT + ' sessions', function () {
        beforeEach(async function () {
          for (let i = 0; i < SESSION_RETENTION_COUNT; i++) {
            await votingSession.defineProposal(
              proposalName,
              proposalUrl,
              proposalHash,
              ANY_TARGET,
              '0x',
              '0',
              '0');
            await votingSession.historizeSessionTest();
          }
        });

        it('Creating a new session should archive the oldest one', async function () {
          const tx = await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 3);
          assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
          assert.equal(tx.logs[0].args.sessionId.toString(), '12', 'session id');
          assert.equal(tx.logs[0].args.voteAt.toString(), NEXT_VOTE_AT, 'voteAt');
          assert.equal(tx.logs[1].event, 'SessionArchived', 'event');
          assert.equal(tx.logs[1].args.sessionId.toString(), '2', 'session id');
          assert.equal(tx.logs[2].event, 'ProposalDefined', 'event');
          assert.equal(tx.logs[2].args.sessionId.toString(), '12', 'session id');
          assert.equal(tx.logs[2].args.proposalId.toString(), '1', 'proposalId');
        });
      });
    });
  });
});
