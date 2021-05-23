'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

// const assertRevert = require('../helpers/assertRevert');
const assertGasEstimate = require('./helpers/assertGasEstimate');
const TokenProxy = artifacts.require('mock/TokenProxyMock.sol');
const TokenDelegate = artifacts.require('mock/TokenDelegateMock.sol');
const TokenCore = artifacts.require('mock/TokenCoreMock.sol');
const VotingSessionManager = artifacts.require('voting/VotingSessionManager.sol');
const VotingSessionDelegate = artifacts.require('voting/VotingSessionDelegate.sol');
const VotingSessionManagerMock = artifacts.require('mock/VotingSessionManagerMock.sol');

const ANY_TARGET = web3.utils.fromAscii('AnyTarget').padEnd(42, '0');
// const ANY_METHOD = web3.utils.fromAscii('AnyMethod').padEnd(10, '0');
const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
// const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = '2';

const SESSION_RETENTION_COUNT = 10;

const VOTING_DELEGATE_DEPLOYMENT_COST = 4544821;
const VOTING_DEPLOYMENT_COST = 2468995;
const DEFINE_FIRST_PROPOSAL_COST = 348505;
const DEFINE_SECOND_PROPOSAL_COST = 211741;
const DEFINE_MIN_PROPOSAL_COST = 151373;
const FIRST_VOTE_COST = 354641;
const SECOND_VOTE_COST = 164163;
const VOTE_ON_BEHALF_COST = 220536;
const EXECUTE_ONE_COST = 80674;
const EXECUTE_ALL_COST = 480680;
const ARCHIVE_SESSION_COST = 259188;
const DEFINE_PROPOSAL_WITH_ARCHIVING_COST = 258604;

contract('Performance', function (accounts) {
  let core, delegate, token, votingSession, votingDelegate;

  const recipients = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[5], accounts[6]];
  const supplies = ['100', '3000000', '2000000', '2000000', '1', '1000000'];

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

    votingDelegate = await VotingSessionDelegate.new();
    votingSession = await VotingSessionManagerMock.new(token.address, votingDelegate.address);

    await core.defineProxy(votingSession.address, 1);
    await core.defineTokenLocks(token.address, [token.address, votingSession.address]);
    await core.assignProxyOperators(votingSession.address, ALL_PRIVILEGES, [votingSession.address]);
    await core.assignProxyOperators(token.address, ALL_PRIVILEGES, [votingSession.address]);
  });

  describe('Performance [ @skip-on-coverage ]', function () {
    it('should have a voting delegate deployed', async function () {
      const gas = await VotingSessionDelegate.new.estimateGas();
      assertGasEstimate(gas, VOTING_DELEGATE_DEPLOYMENT_COST, 'gas');
    });

    it('should have a voting contract deployed', async function () {
      const gas = await VotingSessionManager.new.estimateGas(token.address, votingDelegate.address);
      assertGasEstimate(gas, VOTING_DEPLOYMENT_COST, 'gas');
    });

    it('should estimate a first proposal', async function () {
      const gas = await votingSession.defineProposal.estimateGas(
        proposalName,
        proposalUrl,
        proposalHash,
        ANY_TARGET,
        '0x',
        '0',
        '0');
      assertGasEstimate(gas, DEFINE_FIRST_PROPOSAL_COST, 'estimate');
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
      assertGasEstimate(gas, DEFINE_SECOND_PROPOSAL_COST, 'estimate');
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
      assertGasEstimate(gas, DEFINE_MIN_PROPOSAL_COST, 'estimate');
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

        await votingSession.nextSessionStepTest(2);
      });

      it('should estimate first vote', async function () {
        const gas = await votingSession.submitVote.estimateGas(votes);
        assertGasEstimate(gas, FIRST_VOTE_COST, 'estimate');
      });

      it('should estimate a second vote', async function () {
        await votingSession.submitVote(votes);
        const gas = await votingSession.submitVote.estimateGas(votes, { from: accounts[1] });
        assertGasEstimate(gas, SECOND_VOTE_COST, 'estimate');
      });

      it('should estimate a vote on behalf', async function () {
        const gas = await votingSession.submitVotesOnBehalf.estimateGas(
          [accounts[1], accounts[2]], 3);
        assertGasEstimate(gas, VOTE_ON_BEHALF_COST, 'estimate');
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

        await votingSession.nextSessionStepTest(2);
        await votingSession.submitVote(votes, { from: accounts[1] });
        await votingSession.submitVote(votes, { from: accounts[2] });
        await votingSession.nextSessionStepTest(1);
      });

      it('should estimate resolution of one proposal', async function () {
        const gas = await votingSession.executeResolutions.estimateGas([1]);
        assertGasEstimate(gas, EXECUTE_ONE_COST, 'estimate');
      });

      it('should estimate resolution of all proposal', async function () {
        const gas = await votingSession.executeResolutions.estimateGas(proposals);
        assertGasEstimate(gas, EXECUTE_ALL_COST, 'estimate');
      });

      describe('and a year after closed', function () {
        beforeEach(async function () {
          await votingSession.historizeSessionTest();
        });

        it('should estimate archiving a session', async function () {
          const tx = await votingSession.archiveSession();
          assertGasEstimate(tx.receipt.gasUsed, ARCHIVE_SESSION_COST, 'estimate');
        });
      });

      describe('After ' + SESSION_RETENTION_COUNT + ' sessions', function () {
        beforeEach(async function () {
          await votingSession.historizeSessionTest();

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

        it('should estimate defining a new proposal', async function () {
          const tx = await votingSession.defineProposal('', '', '0x', ANY_TARGET, '0x', '0', '0');
          assertGasEstimate(tx.receipt.gasUsed, DEFINE_PROPOSAL_WITH_ARCHIVING_COST, 'estimate');
        });
      });
    });
  });
});
