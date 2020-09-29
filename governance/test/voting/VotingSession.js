'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const assertGasEstimate = require('../helpers/assertGasEstimate');
const TokenProxy = artifacts.require('mock/TokenProxyMock.sol');
const TokenDelegate = artifacts.require('mock/TokenDelegateMock.sol');
const TokenCore = artifacts.require('mock/TokenCoreMock.sol');
const VotingSession = artifacts.require('voting/VotingSessionMock.sol');

const UNDEFINED_TARGET = web3.utils.fromAscii('UndefinedTarget').padEnd(42, '0');
const ANY_METHODS = web3.utils.fromAscii('AnyMethods').padEnd(10, '0');
const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = '2';

const DAY_IN_SEC = 24 * 3600;
const Periods = {
  campaign: 5 * DAY_IN_SEC,
  voting: 2 * DAY_IN_SEC,
  grace: 7 * DAY_IN_SEC,
};
const DEFAULT_PERIOD_LENGTH =
  Object.values(Periods).reduce((sum, elem) => sum + elem, 0);
const TODAY = Math.floor(new Date().getTime() / 1000);
const NEXT_START_AT =
  (Math.floor((TODAY + Periods.campaign) /
    DEFAULT_PERIOD_LENGTH) + 1
  ) * DEFAULT_PERIOD_LENGTH;
const Times = {
  today: TODAY,
  campaign: NEXT_START_AT - Periods.campaign,
  voting: NEXT_START_AT,
  grace: NEXT_START_AT + (Periods.voting),
  closed: NEXT_START_AT + (Periods.voting + Periods.grace),
};

const SessionState = {
  PLANNED: '0',
  CAMPAIGN: '1',
  VOTING: '2',
  GRACE: '3',
  CLOSED: '4',
};

contract('VotingSession', function (accounts) {
  let core, delegate, token, votingSession, signatures;

  const recipients = [accounts[0], accounts[1], accounts[2], accounts[3]];
  const supplies = ['100', '3000000', '2000000', '2000000'];

  const proposalName = 'Would you like to vote ?';
  const proposalHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const proposalUrl = 'http://url.url';

  before(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new('Test', [accounts[0], accounts[4]]);
    await core.defineTokenDelegate(1, delegate.address, [0, 1]);
    await core.manageSelf(true, { from: accounts[5] });
  });

  beforeEach(async function () {
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.mint(token.address, recipients, supplies);
    votingSession = await VotingSession.new(token.address);
    await core.assignProxyOperators(token.address, ALL_PRIVILEGES, [votingSession.address]);

    signatures = votingSession.abi.filter((method) =>
      method.name === 'updateResolutionRequirements' ||
      method.name === 'updateSessionRule').map((method) => method.signature);
  });

  it('should have a token', async function () {
    const foundToken = await votingSession.token();
    assert.equal(foundToken, token.address, 'token');
  });

  it('should have session rule', async function () {
    const sessionRule = await votingSession.sessionRule();
    assert.equal(sessionRule.campaignPeriod.toString(), '432000', 'campaignPeriod');
    assert.equal(sessionRule.votingPeriod.toString(), '172800', 'votingPeriod');
    assert.equal(sessionRule.gracePeriod.toString(), '604800', 'gracePeriod');
    assert.equal(sessionRule.maxProposals.toString(), '10', 'maxProposals');
    assert.equal(sessionRule.maxProposalsOperator.toString(), '25', 'maxProposalsOperator');
    assert.equal(sessionRule.newProposalThreshold.toString(), '1', 'newProposalThreshold');
    assert.equal(sessionRule.executeResolutionThreshold.toString(), '1', 'executeResolutionThreshold');
  });

  it('should have default resolution requirements', async function () {
    const requirement = await votingSession.resolutionRequirement(UNDEFINED_TARGET, ANY_METHODS);
    assert.equal(requirement.majority.toString(), '50', 'majority');
    assert.equal(requirement.quorum.toString(), '60', 'quorum');
  });

  it('should have no resolution requirements for address 0x, methods 0x', async function () {
    const requirement = await votingSession.resolutionRequirement(NULL_ADDRESS, '0x00000000');
    assert.equal(requirement.majority.toString(), '0', 'majority');
    assert.equal(requirement.quorum.toString(), '0', 'quorum');
  });

  it('should have no voting sessions', async function () {
    const sessionsCount = await votingSession.sessionsCount();
    assert.equal(sessionsCount.toString(), '0', 'count');
  });

  it('should have no voting delegates defined for accounts[0]', async function () {
    const votingDelegate = await votingSession.delegate(accounts[0]);
    assert.equal(votingDelegate, NULL_ADDRESS);
  });

  it('should have no last vote for accounts[0]', async function () {
    const lastVote = await votingSession.lastVote(accounts[0]);
    assert.equal(lastVote.toString(), '0', 'last vote');
  });

  it('should have no proposals', async function () {
    const proposalsCount = await votingSession.proposalsCount();
    assert.equal(proposalsCount, '0', 'count');
  });

  it('should have no proposal 0', async function () {
    await assertRevert(votingSession.proposal(0), 'VS04');
  });

  it('should not have no session state for session 0', async function () {
    await assertRevert(votingSession.sessionStateAt(0, 0), 'VS03');
  });

  it('should let accounts[1] choose accounts[0] for voting delegate', async function () {
    const tx = await votingSession.defineDelegate(accounts[0], { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'DelegateDefined', 'event');
    assert.equal(tx.logs[0].args.voter, accounts[1], 'voter');
    assert.equal(tx.logs[0].args.delegate, accounts[0], 'delegate');
  });

  it('should prevent anyone to add a new proposal', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      UNDEFINED_TARGET,
      '0x', { from: accounts[9] }), 'VS18');
  });

  it('should let investor add a new proposal', async function () {
    const tx = await votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      UNDEFINED_TARGET,
      '0x', { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
    assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[0].args.startAt.toString(), NEXT_START_AT, 'startAt');
    assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
    assert.equal(tx.logs[1].args.proposalId.toString(), '0', 'proposalId');
  });

  it('should let token operator add a new proposal', async function () {
    const tx = await votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      UNDEFINED_TARGET,
      '0x', { from: accounts[4] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
    assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[0].args.startAt.toString(), NEXT_START_AT, 'startAt');
    assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
    assert.equal(tx.logs[1].args.proposalId.toString(), '0', 'proposalId');
  });

  it('should prevent anyone to update session rules', async function () {
    await assertRevert(votingSession.updateSessionRule(
      '60', '60', '60', '1', '2', '3000000', '3000001', { from: accounts[9] }), 'OA02');
  });

  it('should let token operator to update session rules', async function () {
    const tx = await votingSession.updateSessionRule(
      '61', '62', '63', '1', '2', '3000000', '3000001');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'SessionRuleUpdated', 'event');
    assert.equal(tx.logs[0].args.campaignPeriod.toString(), '61', 'campaign period');
    assert.equal(tx.logs[0].args.votingPeriod.toString(), '62', 'voting period');
    assert.equal(tx.logs[0].args.gracePeriod.toString(), '63', 'grace period');
    assert.equal(tx.logs[0].args.maxProposals.toString(), '1', 'max proposals');
    assert.equal(tx.logs[0].args.maxProposalsOperator.toString(), '2', 'max proposals quaestor');
    assert.equal(tx.logs[0].args.newProposalThreshold.toString(), '3000000', 'new proposal threshold');
    assert.equal(tx.logs[0].args.executeResolutionThreshold.toString(), '3000001', 'execute resolution threshold');
  });

  it('should prevent anyone to update resolution requirements', async function () {
    await assertRevert(votingSession.updateResolutionRequirements(
      [UNDEFINED_TARGET, votingSession.address],
      signatures, ['10', '15'], ['10', '15'],
      { from: accounts[9] }), 'OA02');
  });

  it('should prevent operator to update resolution requirements global resolution requirement', async function () {
    await assertRevert(votingSession.updateResolutionRequirements(
      [UNDEFINED_TARGET, UNDEFINED_TARGET, votingSession.address],
      ['0x00000000', ANY_METHODS, '0x12345678'],
      ['10', '0', '15'], ['10', '0', '15']), 'VS16');
  });

  it('should let token operator to update resolution requirements', async function () {
    const tx = await votingSession.updateResolutionRequirements(
      [UNDEFINED_TARGET, votingSession.address], signatures, ['10', '15'], ['10', '15']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'ResolutionRequirementUpdated', 'event');
    assert.equal(tx.logs[0].args.target.toString().toLowerCase(), UNDEFINED_TARGET, 'undefined target');
    assert.equal(tx.logs[0].args.methodSignature.toString(), signatures[0], 'method signature');
    assert.equal(tx.logs[0].args.majority.toString(), '10', 'majority');
    assert.equal(tx.logs[0].args.quorum.toString(), '10', 'quorum');
    assert.equal(tx.logs[1].event, 'ResolutionRequirementUpdated', 'event');
    assert.equal(tx.logs[1].args.target.toString(), votingSession.address, 'core address');
    assert.equal(tx.logs[1].args.methodSignature.toString(), signatures[1], 'method signature');
    assert.equal(tx.logs[1].args.majority.toString(), '15', 'majority');
    assert.equal(tx.logs[1].args.quorum.toString(), '15', 'quorum');
  });

  describe('with a new proposal', function () {
    beforeEach(async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
    });

    it('should have a session count', async function () {
      const sessionsCount = await votingSession.sessionsCount();
      assert.equal(sessionsCount.toString(), '1', 'count');
    });

    it('should have a proposal count', async function () {
      const proposalsCount = await votingSession.proposalsCount();
      assert.equal(proposalsCount.toString(), '1', 'count');
    });

    it('should have a session', async function () {
      const session = await votingSession.session(1);
      assert.equal(session.startAt.toString(), NEXT_START_AT, 'startAt');
      assert.equal(session.proposalsCount, 1, 'proposalsCount');
      assert.equal(session.participation, 0, 'participation');
    });

    it('should have a proposal', async function () {
      const proposal = await votingSession.proposal(0);
      assert.equal(proposal.sessionId.toString(), '1', 'sessionId');
      assert.equal(proposal.name, proposalName, 'name');
      assert.equal(proposal.url, proposalUrl, 'url');
      assert.equal(proposal.proposalHash, proposalHash, 'hash');
      assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
      assert.equal(proposal.resolutionAction, null, 'action');
      assert.equal(proposal.resolutionTarget.toLowerCase(), UNDEFINED_TARGET, 'target');
      assert.equal(proposal.weight.toString(), '100', 'weight');
      assert.equal(proposal.approvals.toString(), '0', 'approvals');
      assert.ok(!proposal.resolutionExecuted, 'executed');
      assert.ok(!proposal.cancelled, 'cancelled');
    });

    it('should have session all status for the different dates', async function () {
      const statuses = await Promise.all(Object.keys(Times).map((key, i) =>
        votingSession.sessionStateAt(1, Times[key]).then((status_) => status_.toString())));
      assert.deepEqual(statuses, [
        SessionState.PLANNED,
        SessionState.CAMPAIGN,
        SessionState.VOTING,
        SessionState.GRACE,
        SessionState.CLOSED,
      ], 'statuses');
    });

    it('should let its author to update the proposal', async function () {
      const tx = await votingSession.updateProposal(0,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ProposalUpdated', 'event');
      assert.equal(tx.logs[0].args.proposalId.toString(), '0', 'proposal id');
    });

    it('should prevent non author to update the proposal', async function () {
      await assertRevert(votingSession.updateProposal(0,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x', { from: accounts[1] }), 'VS02');
    });

    it('should prevent author to update a non existing proposal', async function () {
      await assertRevert(votingSession.updateProposal(2,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x'), 'VS01');
    });

    it('should let its author cancel the proposal', async function () {
      const tx = await votingSession.cancelProposal(0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ProposalCancelled', 'event');
      assert.equal(tx.logs[0].args.proposalId.toString(), '0', 'proposal id');
    });

    it('should prevent non author to cancel the proposal', async function () {
      await assertRevert(votingSession.cancelProposal(0, { from: accounts[1] }), 'VS02');
    });

    it('should prevent author to cancel a non existing proposal', async function () {
      await assertRevert(votingSession.cancelProposal(1), 'VS01');
    });

    describe('during campaign', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
      });

      it('should not be possible to add more proposal', async function () {
        await assertRevert(votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          UNDEFINED_TARGET,
          '0x'), 'VS28');
      });
    });

    describe('during voting', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should have the token locked', async function () {
        const tokenData = await core.lock(token.address);
        assert.equal(tokenData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(tokenData.endAt.toString(), Times.grace, 'lock end');
        assert.deepEqual(tokenData.exceptions, [], 'exceptions');
      });

      it('should be possible to submit a vote', async function () {
        const tx = await votingSession.submitVote([true]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Vote', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.voter, accounts[0], 'voter');
        assert.equal(tx.logs[0].args.weight, '100', 'weight');
      });

      it('should be possible to submit a vote for proposals', async function () {
        const tx = await votingSession.submitVoteForProposals([0], [true]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Vote', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.voter, accounts[0], 'voter');
        assert.equal(tx.logs[0].args.weight, '100', 'weight');
      });

      it('should be possible to submit a vote on behalf', async function () {
        const tx = await votingSession.submitVoteOnBehalf([0], [true],
          [accounts[0], accounts[1]]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'Vote', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.voter, accounts[0], 'voter');
        assert.equal(tx.logs[0].args.weight, '100', 'weight');
        assert.equal(tx.logs[1].event, 'Vote', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[1].args.voter, accounts[1], 'voter');
        assert.equal(tx.logs[1].args.weight, '3000000', 'weight');
      });

      it('should prevent operator to submit a vote on behalf for self managed voter', async function () {
        await assertRevert(votingSession.submitVoteOnBehalf([0], [true],
          [accounts[0], accounts[5]], { from: accounts[0] }), 'VS35');
      });

      it('should prevent operator to submit a vote on behalf with incorrect proposalIds', async function () {
        await assertRevert(votingSession.submitVoteOnBehalf([], [true],
          [accounts[0], accounts[1]]), 'VS33');
      });

      it('should prevent operator to submit vote without voters', async function () {
        await assertRevert(votingSession.submitVoteOnBehalf([0], [true],
          []), 'VS34');
      });

      it('should prevent author to update a proposal', async function () {
        await assertRevert(votingSession.updateProposal(0,
          proposalName + '2',
          proposalUrl,
          proposalHash,
          UNDEFINED_TARGET,
          '0x'), 'VS20');
      });

      it('should prevent author to cancel a proposal', async function () {
        await assertRevert(votingSession.cancelProposal(0), 'VS20');
      });

      describe('after submitted a vote', function () {
        beforeEach(async function () {
          await votingSession.submitVote([true]);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote([true]), 'VS31');
        });
      });

      describe('after submitted a vote for proposals', function () {
        beforeEach(async function () {
          await votingSession.submitVoteForProposals([0], [true]);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote([true]), 'VS31');
        });
      });
    });
  });

  describe('with an approved proposal to change the session rules', function () {
    beforeEach(async function () {
      const request = votingSession.contract.methods.updateSessionRule(
        '61', '62', '63', '1', '2', '3000000', '3000001').encodeABI();
      await votingSession.defineProposal(
        'Changing the rules',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request);
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.submitVote([true], { from: accounts[1] });
      await votingSession.submitVote([true], { from: accounts[2] });
      await votingSession.nextSessionStepTest();
    });

    it('should prevent anyone to execute the resolution', async function () {
      await assertRevert(votingSession.executeResolution(0, { from: accounts[9] }), 'VS21');
    });

    it('should be possible to execute the resolution', async function () {
      const tx = await votingSession.executeResolution(0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'SessionRuleUpdated', 'event');
      assert.equal(tx.logs[0].args.campaignPeriod.toString(), '61', 'campaign period');
      assert.equal(tx.logs[0].args.votingPeriod.toString(), '62', 'voting period');
      assert.equal(tx.logs[0].args.gracePeriod.toString(), '63', 'grace period');
      assert.equal(tx.logs[0].args.maxProposals.toString(), '1', 'max proposals');
      assert.equal(tx.logs[0].args.maxProposalsOperator.toString(), '2', 'max proposals quaestor');
      assert.equal(tx.logs[0].args.newProposalThreshold.toString(), '3000000', 'new proposal threshold');
      assert.equal(tx.logs[0].args.executeResolutionThreshold.toString(), '3000001', 'execute resolution threshold');
      assert.equal(tx.logs[1].event, 'ResolutionExecuted', 'event');
      assert.equal(tx.logs[1].args.proposalId.toString(), '0', 'proposal id');

      const sessionRule = await votingSession.sessionRule();
      assert.equal(sessionRule.campaignPeriod.toString(), '61', 'campaignPeriod');
      assert.equal(sessionRule.votingPeriod.toString(), '62', 'votingPeriod');
      assert.equal(sessionRule.gracePeriod.toString(), '63', 'gracePeriod');
      assert.equal(sessionRule.maxProposals.toString(), '1', 'maxProposals');
      assert.equal(sessionRule.maxProposalsOperator.toString(), '2', 'maxProposalsOperator');
      assert.equal(sessionRule.newProposalThreshold.toString(), '3000000', 'newProposalThreshold');
      assert.equal(sessionRule.executeResolutionThreshold.toString(), '3000001', 'executeResolutionThreshold');
    });
  });

  describe('with an approved proposal to change the resolution requirements', function () {
    let request;

    beforeEach(async function () {
      request = votingSession.contract.methods.updateResolutionRequirements(
        [UNDEFINED_TARGET, votingSession.address],
        signatures, ['10', '15'], ['10', '15']).encodeABI();
      await votingSession.defineProposal(
        'Changing the requirements',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request);
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.submitVote([true], { from: accounts[1] });
      await votingSession.submitVote([true], { from: accounts[2] });
      await votingSession.nextSessionStepTest();
    });

    it('should be possible to execute the resolution', async function () {
      const tx = await votingSession.executeResolution(0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 3);
      assert.equal(tx.logs[0].event, 'ResolutionRequirementUpdated', 'event');
      assert.equal(tx.logs[0].args.methodSignature.toString(), signatures[0], 'method signature');
      assert.equal(tx.logs[0].args.majority.toString(), '10', 'majority');
      assert.equal(tx.logs[0].args.quorum.toString(), '10', 'quorum');
      assert.equal(tx.logs[1].event, 'ResolutionRequirementUpdated', 'event');
      assert.equal(tx.logs[1].args.methodSignature.toString(), signatures[1], 'method signature');
      assert.equal(tx.logs[1].args.majority.toString(), '15', 'majority');
      assert.equal(tx.logs[1].args.quorum.toString(), '15', 'quorum');
      assert.equal(tx.logs[2].event, 'ResolutionExecuted', 'event');
      assert.equal(tx.logs[2].args.proposalId.toString(), '0', 'proposal id');

      const requirement1 = await votingSession.resolutionRequirement(UNDEFINED_TARGET, signatures[0]);
      assert.equal(requirement1.majority.toString(), '10', 'majority');
      assert.equal(requirement1.quorum.toString(), '10', 'quorum');

      const requirement2 = await votingSession.resolutionRequirement(votingSession.address, signatures[1]);
      assert.equal(requirement2.majority.toString(), '15', 'majority');
      assert.equal(requirement2.quorum.toString(), '15', 'quorum');
    });
  });

  describe('after first session', function () {
    beforeEach(async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
    });

    describe('during the grace period', function () {
      it('should be possible to start a second voting session', async function () {
        const firstSession = await votingSession.session(1);
        const tx = await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          UNDEFINED_TARGET,
          '0x');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '2', 'session id');
        assert.equal(tx.logs[0].args.startAt.toString(),
          Number(firstSession.startAt) + DEFAULT_PERIOD_LENGTH, 'startAt');
        assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
        assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
      });
    });

    describe('once the session is closed', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
      });

      it('should be possible to start a second voting session', async function () {
        const firstSession = await votingSession.session(1);
        const tx = await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          UNDEFINED_TARGET,
          '0x');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '2', 'session id');
        assert.equal(tx.logs[0].args.startAt.toString(),
          Number(firstSession.startAt) + 2 * DEFAULT_PERIOD_LENGTH, 'startAt');
        assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
        assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
      });
    });
  });

  describe('with 3 proposals: blank, mint and burn', function () {
    let request1, request2;

    const MINT_MORE_TOKENS = 'Mint more tokens!';

    beforeEach(async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');

      request1 = core.contract.methods.mint(token.address, [accounts[4]], ['13999900']).encodeABI();
      await votingSession.defineProposal(
        MINT_MORE_TOKENS,
        proposalUrl,
        proposalHash,
        core.address,
        request1);

      request2 = core.contract.methods.seize(token.address, accounts[1], '1000000').encodeABI();
      await votingSession.defineProposal(
        'seize dat guy',
        proposalUrl,
        proposalHash,
        core.address,
        request2);
    });

    it('should have 3 proposals', async function () {
      const count = await votingSession.proposalsCount();
      assert.equal(count.toString(), '3', 'count');
    });

    describe('during voting', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should be possible to vote', async function () {
        await votingSession.submitVote([true, false, false]);
      });

      it('should be possible to vote for proposals', async function () {
        await votingSession.submitVoteForProposals([0, 2], [true, true]);
      });

      it('should be possible to vote on behalf', async function () {
        await votingSession.submitVoteOnBehalf([0, 2], [true, true],
          [accounts[1], accounts[2]]);
      });

      it('should have the token locked', async function () {
        const tokenData = await core.lock(token.address);
        assert.equal(tokenData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(tokenData.endAt.toString(), Times.grace, 'lock end');
        assert.deepEqual(tokenData.exceptions, [], 'exceptions');
      });
    });

    describe('without enought votes for the quorum', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVote([true, true, true]);
        await votingSession.submitVote([true, true, false], { from: accounts[3] });
        await votingSession.nextSessionStepTest();
      });

      it('should have a session', async function () {
        const session = await votingSession.session(1);
        assert.equal(session.proposalsCount.toString(), '3', 'proposalsCount');
        assert.equal(session.participation.toString(), '2000100', 'participation');
      });

      it('should have approvals for blank proposal', async function () {
        const proposal = await votingSession.proposal(0);
        assert.equal(proposal.approvals.toString(), '2000100', 'approvals');
      });

      it('should have approvals for mint proposal', async function () {
        const proposal = await votingSession.proposal(1);
        assert.equal(proposal.approvals.toString(), '2000100', 'approvals');
      });

      it('should have approvals for seize proposal', async function () {
        const proposal = await votingSession.proposal(2);
        assert.equal(proposal.approvals.toString(), '100', 'approvals');
      });

      it('should have blank proposal rejected', async function () {
        const approved = await votingSession.isApproved(0);
        assert.ok(!approved, 'rejected');
      });

      it('should have mint proposal rejected', async function () {
        const approved = await votingSession.isApproved(1);
        assert.ok(!approved, 'rejected');
      });

      it('should have seize proposal rejected', async function () {
        const approved = await votingSession.isApproved(2);
        assert.ok(!approved, 'rejected');
      });
    });

    describe('after sucessfull votes, during grace period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVoteOnBehalf([0, 1], [true, true],
          [accounts[0], accounts[1], accounts[2], accounts[3]]);
        await votingSession.nextSessionStepTest();
      });

      it('should have a session', async function () {
        const session = await votingSession.session(1);
        assert.equal(session.proposalsCount.toString(), '3', 'proposalsCount');
        assert.equal(session.participation.toString(), '7000100', 'participation');
      });

      it('should have approvals for blank proposal', async function () {
        const proposal = await votingSession.proposal(0);
        assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
      });

      it('should have approvals for mint proposal', async function () {
        const proposal = await votingSession.proposal(1);
        assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
      });

      it('should have approvals for seize proposal', async function () {
        const proposal = await votingSession.proposal(2);
        assert.equal(proposal.approvals.toString(), '0', 'approvals');
      });

      it('should have blank proposal approved', async function () {
        const approved = await votingSession.isApproved(0);
        assert.ok(approved, 'approved');
      });

      it('should have mint proposal approved', async function () {
        const approved = await votingSession.isApproved(1);
        assert.ok(approved, 'approved');
      });

      it('should have seize proposal rejected', async function () {
        const approved = await votingSession.isApproved(2);
        assert.ok(!approved, 'rejected');
      });

      it('should be possible to execute blank proposal', async function () {
        const tx = await votingSession.executeResolution(0);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[0].args.proposalId.toString(), '0', 'proposal id');
      });

      it('should be possible to execute mint proposal', async function () {
        const tx = await votingSession.executeResolution(1);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[0].args.proposalId.toString(), '1', 'proposal id');

        const totalSupply = await token.totalSupply();
        assert.equal(totalSupply.toString(), '21000000', 'totalSupply');
        const balance4 = await token.balanceOf(accounts[4]);
        assert.equal(balance4.toString(), '13999900', 'balance4');
      });

      it('should execute many resolution', async function () {
        const tx = await votingSession.executeManyResolutions([0, 1]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[0].args.proposalId.toString(), '0', 'proposal id');
        assert.equal(tx.logs[1].event, 'ResolutionExecuted', 'event');
        assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposal id');
      });

      it('should not be possible to execute seize proposal', async function () {
        await assertRevert(votingSession.executeResolution(2), 'VS26');
      });

      it('should be possible to add a proposal', async function () {
        const tx = await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          UNDEFINED_TARGET,
          '0x');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '2', 'session id');
        assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
        assert.equal(tx.logs[1].args.proposalId.toString(), '3', 'proposalId');
      });

      describe('with the next session planned', function () {
        beforeEach(async function () {
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            UNDEFINED_TARGET,
            '0x');
        });

        it('should be possible to execute approved resolutions', async function () {
          const tx = await votingSession.executeManyResolutions([0, 1]);
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
          assert.equal(tx.logs[0].args.proposalId.toString(), '0', 'proposal id');
          assert.equal(tx.logs[1].event, 'ResolutionExecuted', 'event');
          assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposal id');
        });

        describe('with the next session started', function () {
          beforeEach(async function () {
            await votingSession.nextStepTest(1);
          });

          it('should not be possible to execute approved resolution', async function () {
            await assertRevert(votingSession.executeResolution(0), 'VS23');
          });
        });
      });

      describe('after minting', function () {
        beforeEach(async function () {
          await votingSession.executeResolution(1);
        });

        it('should have proposal executed', async function () {
          const proposal = await votingSession.proposal(1);
          assert.equal(proposal.sessionId.toString(), '1', 'sessionId');
          assert.equal(proposal.name, MINT_MORE_TOKENS, 'name');
          assert.equal(proposal.url, proposalUrl, 'url');
          assert.equal(proposal.proposalHash, proposalHash, 'hash');
          assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
          assert.equal(proposal.resolutionAction, request1, 'action');
          assert.equal(proposal.resolutionTarget, core.address, 'target');
          assert.equal(proposal.weight.toString(), '100', 'weight');
          assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
          assert.ok(proposal.resolutionExecuted, 'executed');
          assert.ok(!proposal.cancelled, 'cancelled');
        });

        it('should not be possible to mint twice', async function () {
          await assertRevert(votingSession.executeResolution(1), 'VS25');
        });
      });
    });

    describe('after sucessfull votes, and after grace period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVoteOnBehalf([1], [true],
          [accounts[0], accounts[1], accounts[2], accounts[3]]);
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should not be possible to execute mint proposal anymore', async function () {
        await assertRevert(votingSession.executeResolution(1), 'VS22');
      });
    });
  });

  const DEFINE_FIRST_PROPOSAL_COST = 339727;
  const DEFINE_SECOND_PROPOSAL_COST = 211404;
  const FIRST_VOTE_COST = 321425;
  const SECOND_VOTE_COST = 156425;
  const VOTE_FOR_TWO_PROPOSALS_COST = 138431;
  const VOTE_ON_BEHALF_COST = 188981;
  const EXECUTE_ONE_COST = 85063;
  const EXECUTE_ALL_COST = 660062;

  describe('Performance [ @skip-on-coverage ]', function () {
    it('shoould estimate a first proposal', async function () {
      const gas = await votingSession.defineProposal.estimateGas(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
      await assertGasEstimate(gas, DEFINE_FIRST_PROPOSAL_COST, 'estimate');
    });

    it('shoould estimate a second proposal', async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
      const gas = await votingSession.defineProposal.estimateGas(
        proposalName,
        proposalUrl,
        proposalHash,
        UNDEFINED_TARGET,
        '0x');
      await assertGasEstimate(gas, DEFINE_SECOND_PROPOSAL_COST, 'estimate');
    });

    describe('during voting', function () {
      let votes;

      beforeEach(async function () {
        votes = [];
        for (let i = 0; i < 10; i++) {
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            UNDEFINED_TARGET,
            '0x');
          votes.push(true);
        }

        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should estimate first vote', async function () {
        const gas = await votingSession.submitVote.estimateGas(votes);
        await assertGasEstimate(gas, FIRST_VOTE_COST, 'estimate');
      });

      it('should estimate a second vote', async function () {
        await votingSession.submitVote(votes);
        const gas = await votingSession.submitVote.estimateGas(votes, { from: accounts[1] });
        await assertGasEstimate(gas, SECOND_VOTE_COST, 'estimate');
      });

      it('should estimate a vote for two proposals', async function () {
        const gas = await votingSession.submitVoteForProposals.estimateGas([0, 5],
          [true, true], { from: accounts[1] });
        await assertGasEstimate(gas, VOTE_FOR_TWO_PROPOSALS_COST, 'estimate');
      });

      it('should estimate a vote on behalf', async function () {
        const gas = await votingSession.submitVoteOnBehalf.estimateGas([0, 5],
          [true, true], [accounts[1], accounts[2]]);
        await assertGasEstimate(gas, VOTE_ON_BEHALF_COST, 'estimate');
      });
    });

    describe('during grace period', function () {
      let votes, proposals;

      beforeEach(async function () {
        votes = [];
        proposals = [];
        for (let i = 0; i < 10; i++) {
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            UNDEFINED_TARGET,
            '0x');
          votes.push(true);
          proposals.push(i);
        }

        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVote(votes, { from: accounts[1] });
        await votingSession.submitVote(votes, { from: accounts[2] });

        await votingSession.nextSessionStepTest();
      });

      it('should estimate resolution of one proposal', async function () {
        const gas = await votingSession.executeResolution.estimateGas(0);
        await assertGasEstimate(gas, EXECUTE_ONE_COST, 'estimate');
      });

      it('should estimate resolution of all proposal', async function () {
        const gas = await votingSession.executeManyResolutions.estimateGas(proposals);
        await assertGasEstimate(gas, EXECUTE_ALL_COST, 'estimate');
      });
    });
  });
});
