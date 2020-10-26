'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const assertGasEstimate = require('../helpers/assertGasEstimate');
const TokenProxy = artifacts.require('mock/TokenProxyMock.sol');
const TokenDelegate = artifacts.require('mock/TokenDelegateMock.sol');
const TokenCore = artifacts.require('mock/TokenCoreMock.sol');
const VotingSessionManager = artifacts.require('voting/VotingSessionManagerMock.sol');

const ANY_TARGET = web3.utils.fromAscii('AnyTarget').padEnd(42, '0');
const ANY_METHOD = web3.utils.fromAscii('AnyMethod').padEnd(10, '0');
const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = '2';

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
const MIN_PERIOD_LENGTH = 300;
const MAX_PERIOD_LENGTH = 3652500 * 24 * 3600;
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
  ARCHIVED: '7',
};

contract('VotingSessionManager', function (accounts) {
  let core, delegate, token, votingSession, signatures;

  const recipients = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[5], accounts[6]];
  const supplies = ['100', '3000000', '2000000', '2000000', '1', '1000000'];
  const nonVotingAccounts = [accounts[6]];

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
    votingSession = await VotingSessionManager.new(token.address);

    await core.defineProxy(votingSession.address, 1);
    await core.defineTokenLocks(token.address, [token.address, votingSession.address]);
    await core.assignProxyOperators(votingSession.address, ALL_PRIVILEGES, [votingSession.address]);
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
    assert.equal(sessionRule.executionPeriod.toString(), '86400', 'executionPeriod');
    assert.equal(sessionRule.gracePeriod.toString(), '518400', 'gracePeriod');
    assert.equal(sessionRule.periodOffset.toString(), '172800', 'periodOffset');
    assert.equal(sessionRule.openProposals.toString(), '5', 'openProposals');
    assert.equal(sessionRule.maxProposals.toString(), '20', 'maxProposals');
    assert.equal(sessionRule.maxProposalsOperator.toString(), '25', 'maxProposalsOperator');
    assert.equal(sessionRule.newProposalThreshold.toString(), '1', 'newProposalThreshold');
    assert.deepEqual(sessionRule.nonVotingAddresses, [], 'nonVotingAddresses');
  });

  it('should have default resolution requirements', async function () {
    const requirement = await votingSession.resolutionRequirement(ANY_TARGET, ANY_METHOD);
    assert.equal(requirement.majority.toString(), '500000', 'majority');
    assert.equal(requirement.quorum.toString(), '200000', 'quorum');
    assert.equal(requirement.executionThreshold.toString(), '1', 'executionThreshold');
  });

  it('should have no resolution requirements for address 0x, methods 0x', async function () {
    const requirement = await votingSession.resolutionRequirement(NULL_ADDRESS, '0x00000000');
    assert.equal(requirement.majority.toString(), '0', 'majority');
    assert.equal(requirement.quorum.toString(), '0', 'quorum');
    assert.equal(requirement.executionThreshold.toString(), '0', 'executionThreshold');
  });

  it('should have no oldest session', async function () {
    const oldestSessionId = await votingSession.oldestSessionId();
    assert.equal(oldestSessionId.toString(), '1', 'oldest session id');
  });

  it('should have no current session', async function () {
    const currentSessionId = await votingSession.currentSessionId();
    assert.equal(currentSessionId.toString(), '0', 'current session id');
  });

  it('should have no voting sponsors defined for accounts[0]', async function () {
    const votingSponsor = await votingSession.sponsorOf(accounts[0]);
    assert.equal(votingSponsor.address_, NULL_ADDRESS, 'address');
    assert.equal(votingSponsor.until.toString(), 0, 'until');
  });

  it('should have no last vote for accounts[0]', async function () {
    const lastVote = await votingSession.lastVoteOf(accounts[0]);
    assert.equal(lastVote.toString(), '0', 'last vote');
  });

  it('should have no proposal 0', async function () {
    await assertRevert(votingSession.proposal(0, 0), 'VSM01');
  });

  it('should have a next voting session at different times', async function () {
    const statuses = await Promise.all(Object.keys(Times).map((key, i) =>
      votingSession.nextSessionAt(Times[key]).then((status_) => status_.toString())));
    assert.deepEqual(statuses, [
      '' + NEXT_VOTE_AT,
      '' + (NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH),
      '' + (NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH),
      '' + (NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH),
      '' + (NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH),
      '' + (NEXT_VOTE_AT + 2 * DEFAULT_PERIOD_LENGTH),
    ], 'next sessions');
  });

  it('should not have undefined session state for session 0', async function () {
    const sessionState = await votingSession.sessionStateAt(0, 0);
    assert.equal(sessionState, SessionState.UNDEFINED);
  });

  it('should not have a new proposal threshold without a session', async function () {
    await assertRevert(votingSession.newProposalThresholdAt(0, 0), 'VSM01');
  });

  it('should not have undefined proposal state for proposal 0 from session 0', async function () {
    const proposalState = await votingSession.proposalStateAt(0, 0, 0);
    assert.equal(proposalState, ProposalState.UNDEFINED);
  });

  it('should let accounts[1] choose accounts[0] for voting sponsor', async function () {
    const tx = await votingSession.defineSponsor(accounts[0], Times.closed, { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'SponsorDefined', 'event');
    assert.equal(tx.logs[0].args.voter, accounts[1], 'voter');
    assert.equal(tx.logs[0].args.address_, accounts[0], 'address');
    assert.equal(tx.logs[0].args.until, Times.closed, 'until');
  });

  it('should prevent anyone to add a new proposal', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '0', { from: accounts[9] }), 'VSM22');
  });

  it('should let investor add a new proposal', async function () {
    const tx = await votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '0', { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
    assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[0].args.voteAt.toString(), NEXT_VOTE_AT, 'voteAt');
    assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
    assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
  });

  it('should let operator add a new proposal', async function () {
    const tx = await votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '0', { from: accounts[4] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'SessionScheduled', 'event');
    assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[0].args.voteAt.toString(), NEXT_VOTE_AT, 'voteAt');
    assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
    assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
    assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
  });

  it('should prevent adding a new proposal with invalid dependency', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '5',
      '0'), 'VSM36');
  });

  it('should prevent adding a new proposal with invalid alternative reference', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '5'), 'VSM37');
  });

  it('should prevent anyone to update session rules', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', '3000001', nonVotingAccounts,
      { from: accounts[9] }), 'OA02');
  });

  it('should prevent operator to update session rules above campaign period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MAX_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', '3000001', nonVotingAccounts), 'VSM05');
  });

  it('should prevent operator to update session rules above voting period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', '3000001', nonVotingAccounts), 'VSM06');
  });

  it('should prevent operator to update session rules above execution period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      '0', '1', '1', '2', '3000000', '3000001', nonVotingAccounts), 'VSM07');
  });

  it('should prevent operator to update session rules above grace period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', '3000001', nonVotingAccounts), 'VSM08');
  });

  it('should prevent operator to update session rules with open proposals above max', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '2', '1', '2', '3000000', '3000001', nonVotingAccounts), 'VSM10');
  });

  it('should let operator to update session rules', async function () {
    const tx = await votingSession.updateSessionRule(
      MAX_PERIOD_LENGTH - 1, MAX_PERIOD_LENGTH, MAX_PERIOD_LENGTH, MAX_PERIOD_LENGTH,
      MAX_PERIOD_LENGTH, '1', '1', '2', '3000000', nonVotingAccounts);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'SessionRuleUpdated', 'event');
    assert.equal(tx.logs[0].args.campaignPeriod.toString(), MAX_PERIOD_LENGTH - 1, 'campaign period');
    assert.equal(tx.logs[0].args.votingPeriod.toString(), MAX_PERIOD_LENGTH, 'voting period');
    assert.equal(tx.logs[0].args.executionPeriod.toString(), MAX_PERIOD_LENGTH, 'grace period');
    assert.equal(tx.logs[0].args.gracePeriod.toString(), MAX_PERIOD_LENGTH, 'grace period');
    assert.equal(tx.logs[0].args.periodOffset.toString(), MAX_PERIOD_LENGTH, 'period offset');
    assert.equal(tx.logs[0].args.openProposals.toString(), '1', 'openProposals');
    assert.equal(tx.logs[0].args.maxProposals.toString(), '1', 'max proposals');
    assert.equal(tx.logs[0].args.maxProposalsOperator.toString(), '2', 'max proposals quaestor');
    assert.equal(tx.logs[0].args.newProposalThreshold.toString(), '3000000', 'new proposal threshold');
    assert.deepEqual(tx.logs[0].args.nonVotingAddresses, nonVotingAccounts, 'non voting addresses');
  });

  it('should prevent anyone to update resolution requirements', async function () {
    await assertRevert(votingSession.updateResolutionRequirements(
      [ANY_TARGET, votingSession.address],
      signatures, ['10', '15'], ['10', '15'], ['3000001', '3000001'],
      { from: accounts[9] }), 'OA02');
  });

  it('should prevent operator to remove resolution requirements global resolution requirement', async function () {
    await assertRevert(votingSession.updateResolutionRequirements(
      [ANY_TARGET, ANY_TARGET, votingSession.address],
      ['0x00000000', ANY_METHOD, '0x12345678'],
      ['10', '0', '15'], ['10', '10', '15'], ['100', '100', '100']), 'VSM18');
  });

  it('shnould let operator to update resolution requirements', async function () {
    const tx = await votingSession.updateResolutionRequirements(
      [ANY_TARGET, votingSession.address], signatures,
      ['100000', '150000'], ['100000', '150000'], ['1000000', '2000000']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'ResolutionRequirementUpdated', 'event');
    assert.equal(tx.logs[0].args.target.toString().toLowerCase(), ANY_TARGET, 'undefined target');
    assert.equal(tx.logs[0].args.methodSignature.toString(), signatures[0], 'method signature');
    assert.equal(tx.logs[0].args.majority.toString(), '100000', 'majority');
    assert.equal(tx.logs[0].args.quorum.toString(), '100000', 'quorum');
    assert.equal(tx.logs[0].args.executionThreshold.toString(), '1000000', 'executionThreshold');
    assert.equal(tx.logs[1].event, 'ResolutionRequirementUpdated', 'event');
    assert.equal(tx.logs[1].args.target.toString(), votingSession.address, 'core address');
    assert.equal(tx.logs[1].args.methodSignature.toString(), signatures[1], 'method signature');
    assert.equal(tx.logs[1].args.majority.toString(), '150000', 'majority');
    assert.equal(tx.logs[1].args.quorum.toString(), '150000', 'quorum');
    assert.equal(tx.logs[1].args.executionThreshold.toString(), '2000000', 'executionThreshold');
  });

  it('should prevent archiving session', async function () {
    await assertRevert(votingSession.archiveSession(), 'VMS33');
  });

  describe('with a new proposal', function () {
    beforeEach(async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
    });

    it('should have no oldest session', async function () {
      const oldestSessionId = await votingSession.oldestSessionId();
      assert.equal(oldestSessionId.toString(), '1', 'oldest session id');
    });

    it('should have no current session', async function () {
      const currentSessionId = await votingSession.currentSessionId();
      assert.equal(currentSessionId.toString(), '1', 'current session id');
    });

    it('should have a session state at PLANNED', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const sessionState = await votingSession.sessionStateAt(1, now);
      assert.equal(sessionState.toString(), SessionState.PLANNED, 'session state');
    });

    it('should have a session', async function () {
      const session = await votingSession.session(1);
      assert.equal(session.campaignAt.toString(), Times.campaign, 'campaignAt');
      assert.equal(session.voteAt.toString(), Times.voting, 'voteAt');
      assert.equal(session.executionAt.toString(), Times.execution, 'executionAt');
      assert.equal(session.graceAt.toString(), Times.grace, 'graceAt');
      assert.equal(session.closedAt.toString(), Times.closed, 'closedAt');
      assert.equal(session.proposalsCount.toString(), '1', 'proposalsCount');
      assert.equal(session.participation.toString(), '0', 'participation');
      assert.equal(session.totalSupply.toString(), '8000101', 'totalSupply');
    });

    it('should have a proposal', async function () {
      const proposal = await votingSession.proposal(1, 1);
      assert.equal(proposal.name, proposalName, 'name');
      assert.equal(proposal.url, proposalUrl, 'url');
      assert.equal(proposal.proposalHash, proposalHash, 'hash');
      assert.equal(proposal.resolutionAction, null, 'action');
      assert.equal(proposal.resolutionTarget.toLowerCase(), ANY_TARGET, 'target');
    });

    it('should have a proposal data', async function () {
      const proposal = await votingSession.proposalData(1, 1);
      assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
      assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
      assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
      assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
      assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
      assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
      assert.equal(proposal.approvals.toString(), '0', 'approvals');
    });

    it('should have session all status for the different dates', async function () {
      const statuses = await Promise.all(Object.keys(Times).map((key, i) =>
        votingSession.sessionStateAt(1, Times[key]).then((status_) => status_.toString())));
      assert.deepEqual(statuses, [
        SessionState.PLANNED,
        SessionState.CAMPAIGN,
        SessionState.VOTING,
        SessionState.EXECUTION,
        SessionState.GRACE,
        SessionState.CLOSED,
      ], 'statuses');
    });

    it('should have a proposal state', async function () {
      const statuses = await Promise.all(Object.keys(Times).map((key, i) =>
        votingSession.proposalStateAt(1, 1, Times[key]).then((status_) => status_.toString())));
      assert.deepEqual(statuses, [
        ProposalState.DEFINED,
        ProposalState.LOCKED,
        ProposalState.LOCKED,
        ProposalState.REJECTED,
        ProposalState.REJECTED,
        ProposalState.ARCHIVED,
      ], 'statuses');
    });

    it('should have a new proposal threshold', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 0);
      assert.equal(threshold.toString(), 1, 'threshold');
    });

    it('should have a new proposal threshold below open limit', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 2);
      assert.equal(threshold.toString(), 1, 'threshold');
    });

    it('should have a new proposal threshold at open limit', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 5);
      assert.equal(threshold.toString(), 1, 'threshold');
    });

    it('should have a new proposal threshold above open limit', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 12);
      assert.equal(threshold.toString(), 871122, 'threshold');
    });

    it('should have a new proposal threshold at max limit', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 20);
      assert.equal(threshold.toString(), 4000050, 'threshold');
    });

    it('should have a new proposal threshold above max limit', async function () {
      const threshold = await votingSession.newProposalThresholdAt(1, 100);
      assert.equal(threshold.toString(), 160446410, 'threshold');
    });

    it('should let its author to update the proposal', async function () {
      const tx = await votingSession.updateProposal(1,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ProposalUpdated', 'event');
      assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'proposal id');
      assert.equal(tx.logs[0].args.proposalId.toString(), '1', 'proposal id');
    });

    it('should prevent non author to update the proposal', async function () {
      await assertRevert(votingSession.updateProposal(1,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0', { from: accounts[1] }), 'VSM24');
    });

    it('should prevent author to update a non existing proposal', async function () {
      await assertRevert(votingSession.updateProposal(2,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0'), 'VSM02');
    });

    it('should let its author cancel the proposal', async function () {
      const tx = await votingSession.cancelProposal(1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ProposalCancelled', 'event');
      assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'proposal id');
      assert.equal(tx.logs[0].args.proposalId.toString(), '1', 'proposal id');
    });

    it('should prevent non author to cancel the proposal', async function () {
      await assertRevert(votingSession.cancelProposal(1, { from: accounts[1] }), 'VSM24');
    });

    it('should prevent author to cancel a non existing proposal', async function () {
      await assertRevert(votingSession.cancelProposal(2), 'VSM02');
    });

    describe('when cancelled', function () {
      beforeEach(async function () {
        await votingSession.cancelProposal(1);
      });

      it('should have a proposal state at APPROVED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const proposalState = await votingSession.proposalStateAt(1, 1, now);
        assert.equal(proposalState.toString(), ProposalState.CANCELLED, 'proposal state');
      });
    });

    describe('with a different and two alternative proposals', function () {
      beforeEach(async function () {
        await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '0');
        await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '0');
        await votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '2');
      });

      it('should have proposalData for the reference proposal', async function () {
        const proposal = await votingSession.proposalData(1, 2);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '10', 'alternativesMask');
      });

      it('should have proposalData for the alternative proposal', async function () {
        const proposal = await votingSession.proposalData(1, 4);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
      });

      describe('with the alternative updated', function () {
        beforeEach(async function () {
          await votingSession.updateProposal(
            4,
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
        });

        it('should have proposalData for the reference proposal', async function () {
          const proposal = await votingSession.proposalData(1, 2);
          assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
          assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
          assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
          assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '2', 'alternativesMask');
        });

        it('should have proposalData for the first alternative proposal', async function () {
          const proposal = await votingSession.proposalData(1, 4);
          assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
          assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
          assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
          assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
        });
      });
    });

    describe('during campaign', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
      });

      it('should have a session state at CAMPAIGN', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CAMPAIGN, 'session state');
      });

      it('should not be possible to add more proposal', async function () {
        await assertRevert(votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '0'), 'VSM34');
      });
    });

    describe('during voting', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should have a session state at VOTING', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.VOTING, 'session state');
      });

      it('should have the token locked', async function () {
        const tokenData = await core.lock(votingSession.address);
        assert.equal(tokenData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(tokenData.endAt.toString(), Times.grace, 'lock end');
        assert.deepEqual(tokenData.exceptions, [], 'exceptions');
      });

      it('should be possible to submit a vote', async function () {
        const tx = await votingSession.submitVote(1);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'Vote', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.voter, accounts[0], 'voter');
        assert.equal(tx.logs[0].args.weight, '100', 'weight');
      });

      it('should be possible as the quaestor to submit a vote on behalf', async function () {
        const tx = await votingSession.submitVoteOnBehalf([accounts[0], accounts[1]], 1);
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
        await assertRevert(votingSession.submitVoteOnBehalf([accounts[0], accounts[5]], 1), 'VSM40');
      });

      describe('With sponsoring from account 3 to 2', function () {
        beforeEach(async function () {
          await votingSession.defineSponsor(accounts[2], Times.closed, { from: accounts[3] });
          await votingSession.defineSponsor(accounts[2], Times.closed, { from: accounts[5] });
        });

        it('should have a voting sponsor defined for account 3', async function () {
          const votingSponsor = await votingSession.sponsorOf(accounts[3]);
          assert.equal(votingSponsor.address_, accounts[2], 'address');
          assert.equal(votingSponsor.until.toString(), Times.closed, 'until');
        });

        it('should be possible as account 2 to vote for self and account 3', async function () {
          const tx = await votingSession.submitVoteOnBehalf(
            [accounts[2], accounts[3], accounts[5]], 1, { from: accounts[2] });
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 3);
          assert.equal(tx.logs[0].event, 'Vote', 'event');
          assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[0].args.voter, accounts[2], 'voter');
          assert.equal(tx.logs[0].args.weight, '2000000', 'weight');
          assert.equal(tx.logs[1].event, 'Vote', 'event');
          assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[1].args.voter, accounts[3], 'voter');
          assert.equal(tx.logs[1].args.weight, '2000000', 'weight');
          assert.equal(tx.logs[2].event, 'Vote', 'event');
          assert.equal(tx.logs[2].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[2].args.voter, accounts[5], 'voter');
          assert.equal(tx.logs[2].args.weight, '1', 'weight');
        });
      });

      it('should prevent operator to submit a vote on behalf with incorrect proposalIds', async function () {
        await assertRevert(votingSession.submitVoteOnBehalf([accounts[0], accounts[1]], 2), 'VSM43');
      });

      it('should prevent operator to submit vote without voters', async function () {
        await assertRevert(votingSession.submitVoteOnBehalf([], 1), 'VSM39');
      });

      it('should prevent author to update a proposal', async function () {
        await assertRevert(votingSession.updateProposal(1,
          proposalName + '2',
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x'), 'VSM22');
      });

      it('should prevent author to cancel a proposal', async function () {
        await assertRevert(votingSession.cancelProposal(1), 'VSM23');
      });

      describe('after submitted a vote', function () {
        beforeEach(async function () {
          await votingSession.submitVote(1);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote(1), 'VSM41');
        });
      });

      describe('after submitted a vote on behalf', function () {
        beforeEach(async function () {
          await votingSession.submitVoteOnBehalf([accounts[0]], 1);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote(1), 'VSM41');
        });
      });
    });
  });

  describe('with an approved proposal to change the session rules', function () {
    beforeEach(async function () {
      const request = votingSession.contract.methods.updateSessionRule(
        MIN_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH + 2, MIN_PERIOD_LENGTH + 3, MIN_PERIOD_LENGTH + 4,
        '0', '1', '1', '2', '3000000', nonVotingAccounts).encodeABI();
      await votingSession.defineProposal(
        'Changing the rules',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request,
        '0',
        '0');
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.submitVote(1, { from: accounts[1] });
      await votingSession.submitVote(1, { from: accounts[2] });
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
    });

    it('should have a session state at GRACE', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const sessionState = await votingSession.sessionStateAt(1, now);
      assert.equal(sessionState.toString(), SessionState.GRACE, 'session state');
    });

    it('should prevent anyone to execute the resolution', async function () {
      await assertRevert(votingSession.executeResolutions([1], { from: accounts[9] }), 'VSM27');
    });

    it('should have a proposal state at APPROVED', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const proposalState = await votingSession.proposalStateAt(1, 1, now);
      assert.equal(proposalState.toString(), ProposalState.APPROVED, 'proposal state');
    });

    it('should be possible to execute the resolution', async function () {
      const tx = await votingSession.executeResolutions([1]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, 'SessionRuleUpdated', 'event');
      assert.equal(tx.logs[0].args.campaignPeriod.toString(), MIN_PERIOD_LENGTH + 1, 'campaign period');
      assert.equal(tx.logs[0].args.votingPeriod.toString(), MIN_PERIOD_LENGTH + 2, 'voting period');
      assert.equal(tx.logs[0].args.executionPeriod.toString(), MIN_PERIOD_LENGTH + 3, 'execution period');
      assert.equal(tx.logs[0].args.gracePeriod.toString(), MIN_PERIOD_LENGTH + 4, 'grace period');
      assert.equal(tx.logs[0].args.periodOffset.toString(), '0', 'period offset');
      assert.equal(tx.logs[0].args.openProposals.toString(), '1', 'openProposals');
      assert.equal(tx.logs[0].args.maxProposals.toString(), '1', 'max proposals');
      assert.equal(tx.logs[0].args.maxProposalsOperator.toString(), '2', 'max proposals quaestor');
      assert.equal(tx.logs[0].args.newProposalThreshold.toString(), '3000000', 'new proposal threshold');
      assert.equal(tx.logs[1].event, 'ResolutionExecuted', 'event');
      assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
      assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposal id');

      const sessionRule = await votingSession.sessionRule();
      assert.equal(sessionRule.campaignPeriod.toString(), MIN_PERIOD_LENGTH + 1, 'campaignPeriod');
      assert.equal(sessionRule.votingPeriod.toString(), MIN_PERIOD_LENGTH + 2, 'votingPeriod');
      assert.equal(sessionRule.executionPeriod.toString(), MIN_PERIOD_LENGTH + 3, 'executionPeriod');
      assert.equal(sessionRule.gracePeriod.toString(), MIN_PERIOD_LENGTH + 4, 'gracePeriod');
      assert.equal(sessionRule.periodOffset.toString(), '0', 'period offset');
      assert.equal(sessionRule.openProposals.toString(), '1', 'openProposals');
      assert.equal(sessionRule.maxProposals.toString(), '1', 'maxProposals');
      assert.equal(sessionRule.maxProposalsOperator.toString(), '2', 'maxProposalsOperator');
      assert.equal(sessionRule.newProposalThreshold.toString(), '3000000', 'newProposalThreshold');
    });
  });

  describe('with an approved proposal to change the resolution requirements', function () {
    let request;

    beforeEach(async function () {
      request = votingSession.contract.methods.updateResolutionRequirements(
        [ANY_TARGET, votingSession.address],
        signatures, ['100000', '150000'], ['100000', '150000'], ['1000000', '2000000']).encodeABI();
      await votingSession.defineProposal(
        'Changing the requirements',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request,
        '0',
        '0');
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.submitVote(1, { from: accounts[1] });
      await votingSession.submitVote(1, { from: accounts[2] });
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
    });

    it('should have a session state at GRACE', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const sessionState = await votingSession.sessionStateAt(1, now);
      assert.equal(sessionState.toString(), SessionState.GRACE, 'session state');
    });

    it('should have a proposal state at APPROVED', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const proposalState = await votingSession.proposalStateAt(1, 1, now);
      assert.equal(proposalState.toString(), ProposalState.APPROVED, 'proposal state');
    });

    it('should be possible to execute the resolution', async function () {
      const tx = await votingSession.executeResolutions([1]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 3);
      assert.equal(tx.logs[0].event, 'ResolutionRequirementUpdated', 'event');
      assert.equal(tx.logs[0].args.methodSignature.toString(), signatures[0], 'method signature');
      assert.equal(tx.logs[0].args.majority.toString(), '100000', 'majority');
      assert.equal(tx.logs[0].args.quorum.toString(), '100000', 'quorum');
      assert.equal(tx.logs[0].args.executionThreshold.toString(), '1000000', 'quorum');
      assert.equal(tx.logs[1].event, 'ResolutionRequirementUpdated', 'event');
      assert.equal(tx.logs[1].args.methodSignature.toString(), signatures[1], 'method signature');
      assert.equal(tx.logs[1].args.majority.toString(), '150000', 'majority');
      assert.equal(tx.logs[1].args.quorum.toString(), '150000', 'quorum');
      assert.equal(tx.logs[1].args.executionThreshold.toString(), '2000000', 'quorum');
      assert.equal(tx.logs[2].event, 'ResolutionExecuted', 'event');
      assert.equal(tx.logs[2].args.sessionId.toString(), '1', 'session id');
      assert.equal(tx.logs[2].args.proposalId.toString(), '1', 'proposal id');

      const requirement1 = await votingSession.resolutionRequirement(ANY_TARGET, signatures[0]);
      assert.equal(requirement1.majority.toString(), '100000', 'majority');
      assert.equal(requirement1.quorum.toString(), '100000', 'quorum');
      assert.equal(requirement1.executionThreshold.toString(), '1000000', 'executionThreshold');

      const requirement2 = await votingSession.resolutionRequirement(votingSession.address, signatures[1]);
      assert.equal(requirement2.majority.toString(), '150000', 'majority');
      assert.equal(requirement2.quorum.toString(), '150000', 'quorum');
      assert.equal(requirement2.executionThreshold.toString(), '2000000', 'executionThreshold');
    });
  });

  describe('after first session', function () {
    beforeEach(async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
      await votingSession.nextSessionStepTest();
    });

    describe('during the grace period', function () {
      it('should have a session state at GRACE', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.GRACE, 'session state');
      });

      it('should be possible to start a second voting session', async function () {
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
        // May depends on the current date
        // assert.equal(tx.logs[0].args.voteAt.toString(),
        //   NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH, 'voteAt');
        assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '2', 'session id');
        assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
      });
    });

    describe('once the session is closed', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
      });

      it('should have a session state at CLOSED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
      });

      it('should be possible to start a second voting session', async function () {
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
        assert.equal(tx.logs[0].args.voteAt.toString(),
          ((NEXT_VOTE_AT - TODAY) < Periods.campaign)
            ? NEXT_VOTE_AT + DEFAULT_PERIOD_LENGTH : NEXT_VOTE_AT, 'voteAt');
        assert.equal(tx.logs[1].event, 'ProposalDefined', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '2', 'session id');
        assert.equal(tx.logs[1].args.proposalId.toString(), '1', 'proposalId');
      });
    });
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
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should have a session state at VOTING', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.VOTING, 'session state');
      });

      it('should be possible to vote for a proposal', async function () {
        await votingSession.submitVote(4);
      });

      it('should not be possible to vote for more than one alternative proposal', async function () {
        await assertRevert(votingSession.submitVote(6), 'VSM42');
      });

      it('should be possible to vote on behalf', async function () {
        await votingSession.submitVoteOnBehalf([accounts[1], accounts[2]], 3);
      });

      it('should have the token locked', async function () {
        const lockData = await core.lock(votingSession.address);
        assert.equal(lockData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(lockData.endAt.toString(), Times.grace, 'lock end');
        assert.deepEqual(lockData.exceptions, [], 'exceptions');
      });
    });

    describe('without enough votes for the quorum', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVote(11);
        await votingSession.submitVote(13, { from: accounts[5] });
        await votingSession.nextSessionStepTest();
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
        assert.equal(session.totalSupply.toString(), '7000101', 'totalSupply');
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
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVoteOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 3);
        await votingSession.nextSessionStepTest();
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
        assert.equal(session.totalSupply.toString(), '7000101', 'totalSupply');
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
        await assertRevert(votingSession.executeResolutions([2]), 'VSM31');
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
        await assertRevert(votingSession.executeResolutions([4]), 'VSM30');
      });

      it('should not be possible to add a proposal', async function () {
        await assertRevert(votingSession.defineProposal(
          proposalName,
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x',
          '0',
          '0'), 'VSM34');
      });

      describe('during the grace period', function () {
        beforeEach(async function () {
          await votingSession.nextSessionStepTest();
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
          await votingSession.nextSessionStepTest();
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
          await assertRevert(votingSession.executeResolutions([1, 2]), 'VSM29');
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
            await assertRevert(votingSession.executeResolutions([1]), 'VSM26');
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
          assert.equal(proposal.dependsOn.toString(), '1', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '6', 'alternativesMask');
          assert.equal(proposal.approvals.toString(), '7000100', 'approvals');
        });

        it('should not be possible to mint twice', async function () {
          await assertRevert(votingSession.executeResolutions([2]), 'VSM30');
        });
      });
    });

    describe('after sucessfull votes, and after grace period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVoteOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 1);
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
      });

      it('should have a session state at CLOSED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
      });

      it('should not be possible to execute mint proposal anymore', async function () {
        await assertRevert(votingSession.executeResolutions([1]), 'VSM26');
      });
    });

    describe('A year after the vote is closed', function () {
      beforeEach(async function () {
        await votingSession.historizeSessionTest();
      });

      it('should have a session state at CLOSED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
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

        it('should have a session state at ARCHIVED', async function () {
          const now = Math.floor(new Date().getTime() / 1000);
          const sessionState = await votingSession.sessionStateAt(1, now);
          assert.equal(sessionState.toString(), SessionState.ARCHIVED, 'session state');
        });

        it('should have prooposal state at ARCHIVED', async function () {
          const proposalState = await votingSession.proposalStateAt(1, 1, now);
          assert.equal(proposalState.toString(), ProposalState.ARCHIVED, 'proposal state');
        });
      });

      describe('After 5 sessions', function () {
        beforeEach(async function () {
          for(let i=0; i < 5; i++) {
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
          assert.equal(tx.logs[0].args.sessionId.toString(), '7', 'session id');
          assert.equal(tx.logs[0].args.voteAt.toString(), NEXT_VOTE_AT, 'voteAt');
          assert.equal(tx.logs[1].event, 'SessionArchived', 'event');
          assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[2].event, 'ProposalDefined', 'event');
          assert.equal(tx.logs[2].args.sessionId.toString(), '7', 'session id');
          assert.equal(tx.logs[2].args.proposalId.toString(), '1', 'proposalId');
        });
      });
    });
  });

  const DEFINE_FIRST_PROPOSAL_COST = 372651;
  const DEFINE_SECOND_PROPOSAL_COST = 216257;
  const DEFINE_MIN_PROPOSAL_COST = 157513;
  const FIRST_VOTE_COST = 328924;
  const SECOND_VOTE_COST = 164879;
  const VOTE_ON_BEHALF_COST = 185554;
  const EXECUTE_ONE_COST = 79157;
  const EXECUTE_ALL_COST = 469379;
  const ARCHIVE_SESSION_COST = 10000;
  const DEFINE_PROPOSAL_WITH_ARCHIVING_COST = 377321;

  describe('Performance [ @skip-on-coverage ]', function () {
    it('should estimate a first proposal', async function () {
      const gas = await votingSession.defineProposal.estimateGas(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      await assertGasEstimate(gas, DEFINE_FIRST_PROPOSAL_COST, 'estimate');
    });

    it('should estimate a second proposal', async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      const gas = await votingSession.defineProposal.estimateGas(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      await assertGasEstimate(gas, DEFINE_SECOND_PROPOSAL_COST, 'estimate');
    });

    it('should estimate a second proposal with no names, no urls and no hashes', async function () {
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      const gas = await votingSession.defineProposal.estimateGas('', '', '0x', ANY_TARGET, '0x', '0', '0');
      await assertGasEstimate(gas, DEFINE_MIN_PROPOSAL_COST, 'estimate');
    });

    describe('during voting', function () {
      let votes;

      beforeEach(async function () {
        votes = 0;
        for (let i = 0; i < 10; i++) {
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
          votes += 2 ** i;
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

      it('should estimate a vote on behalf', async function () {
        const gas = await votingSession.submitVoteOnBehalf.estimateGas(
          [accounts[1], accounts[2]], 3);
        await assertGasEstimate(gas, VOTE_ON_BEHALF_COST, 'estimate');
      });
    });

    describe('during execution period', function () {
      let votes, proposals;

      beforeEach(async function () {
        votes = 0;
        proposals = [];
        for (let i = 1; i <= 10; i++) {
          await votingSession.defineProposal(
            proposalName,
            proposalUrl,
            proposalHash,
            ANY_TARGET,
            '0x',
            '0',
            '0');
          votes += 2 ** (i - 1);
          proposals.push(i);
        }

        await votingSession.nextSessionStepTest();
        await votingSession.nextSessionStepTest();
        await votingSession.submitVote(votes, { from: accounts[1] });
        await votingSession.submitVote(votes, { from: accounts[2] });

        await votingSession.nextSessionStepTest();
      });

      it('should estimate resolution of one proposal', async function () {
        const gas = await votingSession.executeResolutions.estimateGas([1]);
        await assertGasEstimate(gas, EXECUTE_ONE_COST, 'estimate');
      });

      it('should estimate resolution of all proposal', async function () {
        const gas = await votingSession.executeResolutions.estimateGas(proposals);
        await assertGasEstimate(gas, EXECUTE_ALL_COST, 'estimate');
      });

      describe('and a year after closed', function () {
        beforeEach(async function () {
          await votingSession.historizeSessionTest();
        });

        it('should estimate archiving a session', async function () {
          const gas = await votingSession.archiveSession.estimateGas();
          await assertGasEstimate(gas, ARCHIVE_SESSION_COST, 'estimate');
        });
      });

      describe('After 5 sessions', function () {
        beforeEach(async function () {
          await votingSession.historizeSessionTest();

          for(let i=0; i < 5; i++) {
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

        it('should estimate defining a new proposal', async function () {
          const tx = await votingSession.defineProposal('', '', '0x', ANY_TARGET, '0x', '0', '0');
          console.log(tx);
          assert.equal(false, true);
        });

        it('should estimate defining a new proposal', async function () {
          const gas = await votingSession.defineProposal.estimateGas('', '', '0x', ANY_TARGET, '0x', '0', '0');
          await assertGasEstimate(gas, DEFINE_PROPOSAL_WITH_ARCHIVING_COST, 'estimate');
        });
      });
    });
  });
});
