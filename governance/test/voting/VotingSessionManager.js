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
const Ownable = artifacts.require('Ownable.sol');

const ANY_TARGET = web3.utils.fromAscii('AnyTarget').padEnd(42, '0');
const ANY_METHOD = web3.utils.fromAscii('AnyMethod').padEnd(10, '0');
const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = '2';

const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));
const MAX_UINT64 = '18446744073709551615';
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

contract('VotingSessionManager', function (accounts) {
  let core, delegate, token, votingSession, votingDelegate, signatures;

  const recipients = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[5], accounts[6]];
  const supplies = ['100', '3500000', '1500000', '2000000', '1', '1000000'];
  const nonVotingAccounts = [accounts[6]];

  const proposalName = 'Would you like to vote ?';
  const proposalHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const proposalUrl = 'http://url.url';

  before(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new('Test', [accounts[0], accounts[4]]);
    await core.defineTokenDelegate(1, delegate.address, [0, 1]);
    await core.manageSelf(true, { from: accounts[5] });
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.mint(token.address, recipients, supplies);

    votingDelegate = await VotingSessionDelegate.new();
  });

  beforeEach(async function () {
    votingSession = await VotingSessionManagerMock.new(token.address, votingDelegate.address);

    await core.defineProxy(votingSession.address, 1);
    await core.defineTokenLocks(token.address, [token.address, votingSession.address]);
    await core.assignProxyOperators(votingSession.address, ALL_PRIVILEGES, [votingSession.address]);

    // defineLock
    await core.assignProxyOperators(token.address, ALL_PRIVILEGES, [votingSession.address]);

    signatures = votingSession.abi.filter((method) =>
      method.name === 'updateResolutionRequirements' ||
      method.name === 'updateSessionRule' ||
      method.name === 'defineContracts').map((method) => method.signature);
  });

  it('should have a contracts', async function () {
    const contracts = await votingSession.contracts();
    assert.equal(contracts.delegate, votingDelegate.address, 'votingDelegate');
    assert.equal(contracts.token, token.address, 'token');
    assert.equal(contracts.core, core.address, 'core');
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
    await assertRevert(votingSession.newProposalThresholdAt(0, 0), 'VD01');
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

  it('should not let non ownable have accounts[0] as voting sponsor', async function () {
    await assertRevert(votingSession.defineSponsorOf(accounts[0], accounts[0], Times.closed));
  });

  it('should not let non owner choose accounts[0] as voting sponsor', async function () {
    const ownable = await Ownable.new();
    await assertRevert(votingSession.defineSponsorOf(ownable.address,
      accounts[0], Times.closed, { from: accounts[1] }), 'VM05');
  });

  it('should let owner choose accounts[0] as voting sponsor', async function () {
    const ownable = await Ownable.new();
    const tx = await votingSession.defineSponsorOf(ownable.address, accounts[2], Times.closed);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'SponsorDefined', 'event');
    assert.equal(tx.logs[0].args.voter, ownable.address, 'voter');
    assert.equal(tx.logs[0].args.address_, accounts[2], 'address');
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
      '0', { from: accounts[9] }), 'VD21');
  });

  it('should adding a new proposal depending on a non existing one', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '10',
      '0', { from: accounts[1] }), 'VD34');
  });

  it('should prevent adding a new proposal depending on itself', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '1',
      '0', { from: accounts[1] }), 'VD34');
  });

  it('should prevent adding a new proposal alternative to non existing one', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '10', { from: accounts[1] }), 'VD35');
  });

  it('should prevent adding a new proposal alternative on itself', async function () {
    await assertRevert(votingSession.defineProposal(
      proposalName,
      proposalUrl,
      proposalHash,
      ANY_TARGET,
      '0x',
      '0',
      '1', { from: accounts[1] }), 'VD35');
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

  it('should prevent anyone to define contracts', async function () {
    await assertRevert(votingSession.defineContracts(token.address, votingDelegate.address,
      { from: accounts[9] }), 'VM01');
  });

  it('should prevent anyone to define contracts with null token', async function () {
    await assertRevert(votingSession.defineContracts(NULL_ADDRESS, token.address), 'VM02');
  });

  it('should prevent anyone to define contracts with null delegate', async function () {
    await assertRevert(votingSession.defineContracts(votingDelegate.address, NULL_ADDRESS), 'VM03');
  });

  it('should prevent anyone to define contracts with null core', async function () {
    const proxy = await TokenProxy.new(NULL_ADDRESS);
    await assertRevert(votingSession.defineContracts(proxy.address, votingDelegate.address), 'VM04');
  });

  it('should let define new contracts with same contracts', async function () {
    const tx = await votingSession.defineContracts(token.address, votingDelegate.address);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 0);
  });

  it('should let migrate new contracts with different contracts same core', async function () {
    const votingSession2 = await VotingSessionManagerMock.new(token.address, votingDelegate.address);
    const votingDelegate2 = await VotingSessionDelegate.new();
    const token2 = await TokenProxy.new(core.address);

    const tx = await votingSession2.defineContracts(token2.address, votingDelegate2.address);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'TokenDefined', 'event');
    assert.equal(tx.logs[0].args.token, token2.address, 'token');
    assert.equal(tx.logs[0].args.core, core.address, 'core');
    assert.equal(tx.logs[1].event, 'DelegateDefined', 'event');
    assert.equal(tx.logs[1].args.delegate.toString(), votingDelegate2.address, 'delegate');
  });

  it('should let migrate new contracts with same contracts different core', async function () {
    const token2 = await TokenProxy.new(core.address);
    await core.defineToken(
      token2.address, 1, NAME, SYMBOL, DECIMALS);
    const votingSession2 = await VotingSessionManagerMock.new(token2.address, votingDelegate.address);
    const core2 = await TokenCore.new('Test', [accounts[0], accounts[4]]);
    await core2.defineTokenDelegate(1, delegate.address, [0, 1]);
    await core.migrateProxy(token2.address, core2.address);
    await core2.defineToken(
      token2.address, 1, NAME, SYMBOL, DECIMALS);

    const tx = await votingSession2.defineContracts(token2.address, votingDelegate.address);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'TokenDefined', 'event');
    assert.equal(tx.logs[0].args.token, token2.address, 'token');
    assert.equal(tx.logs[0].args.core, core2.address, 'core');
  });

  it('should prevent anyone to update session rules', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', nonVotingAccounts,
      { from: accounts[9] }), 'VM01');
  });

  it('should prevent operator to update session rules above campaign period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MAX_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', nonVotingAccounts), 'VD03');
  });

  it('should prevent operator to update session rules above voting period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', nonVotingAccounts), 'VD04');
  });

  it('should prevent operator to update session rules above execution period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH + 1, MAX_PERIOD_LENGTH,
      '0', '1', '1', '2', '3000000', nonVotingAccounts), 'VD05');
  });

  it('should prevent operator to update session rules above grace period length limit', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MAX_PERIOD_LENGTH + 1,
      '0', '1', '1', '2', '3000000', nonVotingAccounts), 'VD06');
  });

  it('should prevent operator to update session rules with open proposals above max', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH + 1,
      '0', '2', '1', '2', '3000000', nonVotingAccounts), 'VD08');
  });

  it('should prevent operator to update session rules with duplicates in non voting addresses', async function () {
    await assertRevert(votingSession.updateSessionRule(
      MAX_PERIOD_LENGTH - 1, MAX_PERIOD_LENGTH, MAX_PERIOD_LENGTH, MAX_PERIOD_LENGTH,
      MAX_PERIOD_LENGTH, '1', '1', '2', '3000000', [accounts[2], accounts[2]]), 'VD12');
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
      { from: accounts[9] }), 'VM01');
  });

  it('should prevent operator to remove resolution requirements global resolution requirement', async function () {
    await assertRevert(votingSession.updateResolutionRequirements(
      [ANY_TARGET, ANY_TARGET, votingSession.address],
      ['0x00000000', ANY_METHOD, '0x12345678'],
      ['10', '0', '15'], ['10', '10', '15'], ['100', '100', '100']), 'VD17');
  });

  it('shnould let operator to update resolution requirements', async function () {
    const tx = await votingSession.updateResolutionRequirements(
      [ANY_TARGET, votingSession.address, votingSession.address], signatures,
      ['100000', '150000', '100000'], ['100000', '150000', '100000'], ['1000000', '2000000', '1000000']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 3);
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
    assert.equal(tx.logs[2].event, 'ResolutionRequirementUpdated', 'event');
    assert.equal(tx.logs[2].args.target.toString(), votingSession.address, 'core address');
    assert.equal(tx.logs[2].args.methodSignature.toString(), signatures[2], 'method signature');
    assert.equal(tx.logs[2].args.majority.toString(), '100000', 'majority');
    assert.equal(tx.logs[2].args.quorum.toString(), '100000', 'quorum');
    assert.equal(tx.logs[2].args.executionThreshold.toString(), '1000000', 'executionThreshold');
  });

  it('should prevent archiving session', async function () {
    await assertRevert(votingSession.archiveSession(), 'VD01');
  });

  describe('with a new proposal', function () {
    beforeEach(async function () {
      await votingSession.updateSessionRule(
        5 * DAY_IN_SEC, 2 * DAY_IN_SEC, DAY_IN_SEC, 6 * DAY_IN_SEC, 2 * DAY_IN_SEC,
        '5', '20', '25', '1', nonVotingAccounts);
      await votingSession.defineProposal(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
    });

    it('should have one oldest session', async function () {
      const oldestSessionId = await votingSession.oldestSessionId();
      assert.equal(oldestSessionId.toString(), '1', 'oldest session id');
    });

    it('should have one current session', async function () {
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
      assert.equal(session.votingSupply.toString(), '0', 'votingSupply');
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
      assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
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
        ProposalState.CLOSED,
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
        '0', { from: accounts[1] }), 'VD23');
    });

    it('should prevent author to update a non existing proposal', async function () {
      await assertRevert(votingSession.updateProposal(2,
        proposalName + '2',
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0'), 'VD02');
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
      await assertRevert(votingSession.cancelProposal(1, { from: accounts[1] }), 'VD23');
    });

    it('should prevent author to cancel a non existing proposal', async function () {
      await assertRevert(votingSession.cancelProposal(2), 'VD02');
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
        assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '10', 'alternativesMask');
        assert.equal(proposal.approvals.toString(), '0', 'approvals');
      });

      it('should have proposalData for the alternative proposal', async function () {
        const proposal = await votingSession.proposalData(1, 4);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
        assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
        assert.equal(proposal.approvals.toString(), '0', 'approvals');
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
          assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
          assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '2', 'alternativesMask');
          assert.equal(proposal.approvals.toString(), '0', 'approvals');
        });

        it('should have proposalData for the first alternative proposal', async function () {
          const proposal = await votingSession.proposalData(1, 4);
          assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
          assert.equal(proposal.requirementMajority.toString(), '500000', 'majority');
          assert.equal(proposal.requirementQuorum.toString(), '200000', 'quorum');
          assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
          assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
          assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
          assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
          assert.equal(proposal.approvals.toString(), '0', 'approvals');
        });
      });
    });

    describe('during campaign', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(1);
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
          '0'), 'VD11');
      });
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

      it('should have the token locked', async function () {
        const lockData = await core.lock(votingSession.address, ANY_ADDRESSES, ANY_ADDRESSES);
        assert.equal(lockData.startAt.toString(), Times.voting, 'lock start');
        assert.equal(lockData.endAt.toString(), Times.execution, 'lock end');
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

      it('should prevent a non voting address to vote', async function () {
        await assertRevert(votingSession.submitVote(1, { from: accounts[6] }), 'VD39');
      });

      it('should be possible as the quaestor to submit a vote on behalf', async function () {
        const tx = await votingSession.submitVotesOnBehalf([accounts[0], accounts[1]], 1);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'Vote', 'event');
        assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[0].args.voter, accounts[0], 'voter');
        assert.equal(tx.logs[0].args.weight, '100', 'weight');
        assert.equal(tx.logs[1].event, 'Vote', 'event');
        assert.equal(tx.logs[1].args.sessionId.toString(), '1', 'session id');
        assert.equal(tx.logs[1].args.voter, accounts[1], 'voter');
        assert.equal(tx.logs[1].args.weight, '3500000', 'weight');
      });

      it('should prevent operator to submit a vote on behalf for self managed voter', async function () {
        await assertRevert(votingSession.submitVotesOnBehalf([accounts[0], accounts[5]], 1), 'VD38');
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
          const tx = await votingSession.submitVotesOnBehalf(
            [accounts[2], accounts[3], accounts[5]], 1, { from: accounts[2] });
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 3);
          assert.equal(tx.logs[0].event, 'Vote', 'event');
          assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[0].args.voter, accounts[2], 'voter');
          assert.equal(tx.logs[0].args.weight, '1500000', 'weight');
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
        await assertRevert(votingSession.submitVotesOnBehalf([accounts[0], accounts[1]], 2), 'VD42');
      });

      it('should prevent operator to submit vote without voters', async function () {
        await assertRevert(votingSession.submitVotesOnBehalf([], 1), 'VD37');
      });

      it('should prevent author to update a proposal', async function () {
        await assertRevert(votingSession.updateProposal(1,
          proposalName + '2',
          proposalUrl,
          proposalHash,
          ANY_TARGET,
          '0x', '0', '0'), 'VD22');
      });

      it('should prevent author to cancel a proposal', async function () {
        await assertRevert(votingSession.cancelProposal(1), 'VD22');
      });

      describe('after submitted a vote', function () {
        beforeEach(async function () {
          await votingSession.submitVote(1);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote(1), 'VD39');
        });
      });

      describe('after submitted a vote on behalf', function () {
        beforeEach(async function () {
          await votingSession.submitVotesOnBehalf([accounts[0]], 1);
        });

        it('should not be possible to vote twice', async function () {
          await assertRevert(votingSession.submitVote(1), 'VD39');
        });
      });
    });
  });

  describe('with an approved proposal to change the session rules', function () {
    beforeEach(async function () {
     const request1 = votingSession.contract.methods.updateSessionRule(
        MIN_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH + 2, MIN_PERIOD_LENGTH + 3, MIN_PERIOD_LENGTH + 4,
        '0', '1', '1', '2', '3000000', nonVotingAccounts).encodeABI();
      const request2 = votingSession.contract.methods.updateSessionRule(
        MIN_PERIOD_LENGTH + 1, MIN_PERIOD_LENGTH + 2, MIN_PERIOD_LENGTH + 3, MIN_PERIOD_LENGTH + 4,
        '0', '1', '1', '2', '3000000', []).encodeABI();
      await votingSession.defineProposal(
        'Changing the rules',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request1,
        '0',
        '0');
      await votingSession.defineProposal(
        'Changing the rules',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request2,
        '1',
        '0');
      await votingSession.nextSessionStepTest(2);
      await votingSession.submitVote(3, { from: accounts[1] });
      await votingSession.submitVote(3, { from: accounts[2] });
      await votingSession.nextSessionStepTest(2);
    });

    it('should have a session state at GRACE', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const sessionState = await votingSession.sessionStateAt(1, now);
      assert.equal(sessionState.toString(), SessionState.GRACE, 'session state');
    });

    it('should prevent anyone to execute the resolution', async function () {
      await assertRevert(votingSession.executeResolutions([1], { from: accounts[9] }), 'VD26');
    });

    it('should have a proposal state at APPROVED', async function () {
      const now = Math.floor(new Date().getTime() / 1000);
      const proposalState = await votingSession.proposalStateAt(1, 1, now);
      assert.equal(proposalState.toString(), ProposalState.APPROVED, 'proposal state');
    });

    it('should be possible to execute the first resolution', async function () {
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
    });

    describe('once the first executions processed', async function () {
      beforeEach(async function () {
        await votingSession.executeResolutions([1]);
      });

      it('should have session rule', async function () {
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
        assert.equal(sessionRule.nonVotingAddresses.toString(), nonVotingAccounts, 'nonVotingAddresses');
      });

      it('should have last vote', async function () {
        const lastVote = await votingSession.lastVoteOf(accounts[6]);
        assert.equal(lastVote.toString(), MAX_UINT64, 'last vote');
      });

      it('should after execution of second resolutions have last vote', async function () {
        await votingSession.executeResolutions([2]);
        const lastVote = await votingSession.lastVoteOf(accounts[6]);
        assert.ok(lastVote > 0 && lastVote < MAX_UINT64, 'last vote');
      });
    });
  });

  describe('with an approved proposal to change the resolution requirements', function () {
    let request;

    beforeEach(async function () {
      request = votingSession.contract.methods.updateResolutionRequirements(
        [ANY_TARGET, votingSession.address, votingSession.address],
        signatures,
        ['100000', '150000', '100000'],
        ['100000', '150000', '100000'],
        ['1000000', '2000000', '1000000']).encodeABI();
      await votingSession.defineProposal(
        'Changing the requirements',
        proposalUrl,
        proposalHash,
        votingSession.address,
        request,
        '0',
        '0');
      await votingSession.nextSessionStepTest(2);
      await votingSession.submitVote(1, { from: accounts[1] });
      await votingSession.submitVote(1, { from: accounts[2] });
      await votingSession.nextSessionStepTest(2);
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
      assert.equal(tx.logs.length, 4);
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
      assert.equal(tx.logs[2].event, 'ResolutionRequirementUpdated', 'event');
      assert.equal(tx.logs[2].args.methodSignature.toString(), signatures[2], 'method signature');
      assert.equal(tx.logs[2].args.majority.toString(), '100000', 'majority');
      assert.equal(tx.logs[2].args.quorum.toString(), '100000', 'quorum');
      assert.equal(tx.logs[2].args.executionThreshold.toString(), '1000000', 'quorum');
      assert.equal(tx.logs[3].event, 'ResolutionExecuted', 'event');
      assert.equal(tx.logs[3].args.sessionId.toString(), '1', 'session id');
      assert.equal(tx.logs[3].args.proposalId.toString(), '1', 'proposal id');

      const requirement1 = await votingSession.resolutionRequirement(ANY_TARGET, signatures[0]);
      assert.equal(requirement1.majority.toString(), '100000', 'majority');
      assert.equal(requirement1.quorum.toString(), '100000', 'quorum');
      assert.equal(requirement1.executionThreshold.toString(), '1000000', 'executionThreshold');

      const requirement2 = await votingSession.resolutionRequirement(votingSession.address, signatures[1]);
      assert.equal(requirement2.majority.toString(), '150000', 'majority');
      assert.equal(requirement2.quorum.toString(), '150000', 'quorum');
      assert.equal(requirement2.executionThreshold.toString(), '2000000', 'executionThreshold');

      const requirement3 = await votingSession.resolutionRequirement(votingSession.address, signatures[2]);
      assert.equal(requirement3.majority.toString(), '100000', 'majority');
      assert.equal(requirement3.quorum.toString(), '100000', 'quorum');
      assert.equal(requirement3.executionThreshold.toString(), '1000000', 'executionThreshold');
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
      await votingSession.nextSessionStepTest(4);
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
        await votingSession.nextSessionStepTest(1);
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

  describe('with a 100% majority and quorum', function () {

    beforeEach(async function () {
      await votingSession.updateResolutionRequirements(
        [NULL_ADDRESS], [ANY_METHOD], ['1000000'], ['1000000'], ['1']);
    });

    it('should not accept it without enougth votes', async function() {
      await votingSession.defineProposal(
        'something else',
        proposalUrl,
        proposalHash,
        NULL_ADDRESS,
        '0x',
        '0',
        '0');
       await votingSession.nextSessionStepTest(2);
       await votingSession.submitVote(1);
       const result = await votingSession.proposalApproval(1, 1);
       assert.ok(!result, 'rejected');
    });

    it('should accept a proposal with many votes', async function() {
      await votingSession.defineProposal(
        'something else',
        proposalUrl,
        proposalHash,
        NULL_ADDRESS,
        '0x',
        '0',
        '0');
       await votingSession.nextSessionStepTest(2);
       await votingSession.submitVotesOnBehalf(
         [accounts[0], accounts[1], accounts[2], accounts[3], accounts[6]], 1);
       await votingSession.submitVote(1, { from: accounts[5] });
       const result = await votingSession.proposalApproval(1, 1);
       assert.ok(result, 'approved');
    });

    it('should accept a proposal with many nonvoting accounts', async function() {
      await votingSession.updateSessionRule(
        MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH, MIN_PERIOD_LENGTH,
        '0', '5', '5', '5', '9', [accounts[1], accounts[2], accounts[3], accounts[5], accounts[6]]);

      await votingSession.defineProposal(
        'something else',
        proposalUrl,
        proposalHash,
        NULL_ADDRESS,
        '0x',
        '0',
        '0');
       await votingSession.nextSessionStepTest(2);
       await votingSession.submitVote(1);
       const result = await votingSession.proposalApproval(1, 1);
       assert.ok(result, 'approved');
    });
  });

  describe('with an election between 3 candidates for becoming quaestor', function () {
    let request1, request2, request3;

    const QUAESTOR_ROLE = web3.utils.fromAscii('Quaestor').padEnd(66, '0');

    beforeEach(async function () {
      const assignProxyOperatorsSig = core.abi.filter((method) =>
        method.name === 'assignProxyOperators').map((method) => method.signature);
      await votingSession.updateResolutionRequirements(
        [core.address], assignProxyOperatorsSig, ['250000'], ['100000'], ['1']);

      await votingSession.defineProposal(
        'something else',
        proposalUrl,
        proposalHash,
        NULL_ADDRESS,
        '0x',
        '0',
        '0');

      request1 = core.contract.methods.assignProxyOperators(
        votingSession.address, QUAESTOR_ROLE, [accounts[1]]).encodeABI();
      await votingSession.defineProposal(
        'Candidate1',
        proposalUrl,
        proposalHash,
        core.address,
        request1,
        '0',
        '0');

      request2 = core.contract.methods.assignProxyOperators(
        votingSession.address, QUAESTOR_ROLE, [accounts[2]]).encodeABI();
      await votingSession.defineProposal(
        'Candidate2',
        proposalUrl,
        proposalHash,
        core.address,
        request2,
        '0',
        '2');

      await votingSession.defineProposal(
        'something else',
        proposalUrl,
        proposalHash,
        NULL_ADDRESS,
        '0x',
        '0',
        '0');

      request3 = core.contract.methods.assignProxyOperators(
        votingSession.address, QUAESTOR_ROLE, [accounts[3]]).encodeABI();
      await votingSession.defineProposal(
        'Candidate3',
        proposalUrl,
        proposalHash,
        core.address,
        request3,
        '0',
        '2');
    });

    it('should have proposal candidate 1', async function () {
      const proposal = await votingSession.proposalData(1, 2);
      assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
      assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
      assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
      assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
      assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
      assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
      assert.equal(proposal.alternativesMask.toString(), '22', 'alternativesMask');
      assert.equal(proposal.approvals.toString(), '0', 'approvals');
    });

    it('should have proposal candidate 2', async function () {
      const proposal = await votingSession.proposalData(1, 3);
      assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
      assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
      assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
      assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
      assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
      assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
      assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
      assert.equal(proposal.approvals.toString(), '0', 'approvals');
    });

    it('should have proposal candidate 3', async function () {
      const proposal = await votingSession.proposalData(1, 5);
      assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
      assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
      assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
      assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
      assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
      assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
      assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
      assert.equal(proposal.approvals.toString(), '0', 'approvals');
    });

    describe('during voting', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
      });

      it('should be possible to vote for a proposal', async function () {
        await votingSession.submitVote(11);
      });

      it('should not be possible to vote for more than one alternative proposal (1)', async function () {
        await assertRevert(votingSession.submitVote(6), 'VD41');
      });

      it('should not be possible to vote for more than one alternative proposal (2)', async function () {
        await assertRevert(votingSession.submitVote(18), 'VD41');
      });

      it('should not be possible to vote for more than one alternative proposal (1)', async function () {
        await assertRevert(votingSession.submitVote(22), 'VD41');
      });
    });

    describe('without enough votes for candidate 1', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(2, { from: accounts[1] });
        await votingSession.submitVote(4, { from: accounts[2] });
        await votingSession.submitVote(16, { from: accounts[3] });
        await votingSession.nextSessionStepTest(1);
      });

      it('should have proposal candidate 1 approved', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(approved, 'approved');
      });

      it('should have proposal candidate 2 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(!approved, 'rejected');
      });

      it('should have proposal candidate 3 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 5);
        assert.ok(!approved, 'rejected');
      });
    });

    describe('without enough votes for candidate 2', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(4, { from: accounts[1] });
        await votingSession.submitVote(2, { from: accounts[2] });
        await votingSession.submitVote(16, { from: accounts[3] });
        await votingSession.nextSessionStepTest(1);
      });

      it('should have proposal candidate 1 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(!approved, 'rejected');
      });

      it('should have proposal candidate 2 approved', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(approved, 'approved');
      });

      it('should have proposal candidate 3 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 5);
        assert.ok(!approved, 'rejected');
      });
    });

    describe('without enough votes for candidate 3', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(16, { from: accounts[1] });
        await votingSession.submitVote(4, { from: accounts[2] });
        await votingSession.submitVote(2, { from: accounts[3] });
        await votingSession.nextSessionStepTest(1);
      });

      it('should have proposal candidate 1', async function () {
        const proposal = await votingSession.proposalData(1, 2);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
        assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '0', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '22', 'alternativesMask');
        assert.equal(proposal.approvals.toString(), '2000000', 'approvals');
      });

      it('should have proposal candidate 2', async function () {
        const proposal = await votingSession.proposalData(1, 3);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
        assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
        assert.equal(proposal.approvals.toString(), '1500000', 'approvals');
      });

      it('should have proposal candidate 3', async function () {
        const proposal = await votingSession.proposalData(1, 5);
        assert.equal(proposal.proposedBy, accounts[0], 'proposedBy');
        assert.equal(proposal.requirementMajority.toString(), '250000', 'majority');
        assert.equal(proposal.requirementQuorum.toString(), '100000', 'quorum');
        assert.equal(proposal.executionThreshold.toString(), '1', 'executionThreshold');
        assert.equal(proposal.dependsOn.toString(), '0', 'dependsOn');
        assert.equal(proposal.alternativeOf.toString(), '2', 'alternativeOf');
        assert.equal(proposal.alternativesMask.toString(), '0', 'alternativesMask');
        assert.equal(proposal.approvals.toString(), '3500000', 'approvals');
      });

      it('should have proposal candidate 1 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(!approved, 'rejected');
      });

      it('should have proposal candidate 2 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(!approved, 'rejected');
      });

      it('should have proposal candidate 3 approved', async function () {
        const approved = await votingSession.proposalApproval(1, 5);
        assert.ok(approved, 'approved');
      });
    });

    describe('with equality between candidate 2 and 3', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(16, { from: accounts[1] });
        await votingSession.submitVotesOnBehalf([accounts[2], accounts[3]], 4);
        await votingSession.nextSessionStepTest(1);
      });

      it('should have proposal candidate 1 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 2);
        assert.ok(!approved, 'rejected');
      });

      it('should have proposal candidate 2 approved', async function () {
        const approved = await votingSession.proposalApproval(1, 3);
        assert.ok(approved, 'approved');
      });

      it('should have proposal candidate 3 rejected', async function () {
        const approved = await votingSession.proposalApproval(1, 5);
        assert.ok(!approved, 'rejected');
      });
    });

    describe('after sucessfull votes, during execution period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVotesOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 4);
        await votingSession.nextSessionStepTest(1);
      });

      it('should have a session', async function () {
        const session = await votingSession.session(1);
        assert.equal(session.proposalsCount.toString(), '5', 'proposalsCount');
        assert.equal(session.participation.toString(), '7000100', 'participation');
        assert.equal(session.totalSupply.toString(), '8000101', 'totalSupply');
        assert.equal(session.votingSupply.toString(), '8000101', 'votingSupply');
      });

      it('should not be possible to executed candidate1 proposal', async function () {
        await assertRevert(votingSession.executeResolutions([3]), 'VD31');
      });

      describe('With admin privileges', function () {
        beforeEach(async function () {
          await core.assignOperators(ALL_PRIVILEGES, [votingSession.address]);
        });

        it('should be possible to execute candidate1 proposal', async function () {
          const tx = await votingSession.executeResolutions([3]);
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'ResolutionExecuted', 'event');
          assert.equal(tx.logs[0].args.sessionId.toString(), '1', 'session id');
          assert.equal(tx.logs[0].args.proposalId.toString(), '3', 'proposal id');
        });
      });
    });

    describe('after sucessfull votes, and after grace period', function () {
      beforeEach(async function () {
        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVotesOnBehalf(
          [accounts[0], accounts[1], accounts[2], accounts[3]], 4);
        await votingSession.nextSessionStepTest(3);
      });

      it('should have a session state at CLOSED', async function () {
        const now = Math.floor(new Date().getTime() / 1000);
        const sessionState = await votingSession.sessionStateAt(1, now);
        assert.equal(sessionState.toString(), SessionState.CLOSED, 'session state');
      });

      it('should not be possible to execute the proposal anymore', async function () {
        await assertRevert(votingSession.executeResolutions([3]), 'VD25');
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
