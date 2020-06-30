'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const assertRevert = require('../helpers/assertRevert');
const VotingCore = artifacts.require('../contracts/voting/VotingCore.sol');

contract('VotingCore', function (accounts) {
  let votingCore;
  const expectedQuestion = 'Will you share the dividend ?';
  const expectedHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const expectedUrl = 'http://url.url';
  const before = Math.floor((new Date()).getTime() / 1000);

  beforeEach(async function () {
    votingCore = await VotingCore.new();
  });

  describe('without any proposals', function () {
    it('should return 0 for proposals count', async function () {
      const count = await votingCore.proposalsCount();
      assert.equal(count, 0, 'count');
    });
  });

  describe('with two new proposals', function () {
    beforeEach(async function () {
      await votingCore.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
      await votingCore.addProposal(expectedQuestion, expectedUrl, expectedHash, 3);
    });

    it('should return 2 for proposals count', async function () {
      const count = await votingCore.proposalsCount();
      assert.equal(count.toNumber(), 2, 'count');
    });

    it('should return url for a proposal', async function () {
      const url = await votingCore.proposalUrl(0);
      assert.equal(url, expectedUrl, 'url');
    });

    it('should return hash for a proposal', async function () {
      const hash = web3.utils.toHex(await votingCore.proposalHash(0));
      assert.equal(hash, expectedHash, 'hash');
    });

    it('should return options available for a proposal', async function () {
      const options = await votingCore.proposalOptionsAvailable(0);
      assert.equal(options.toNumber(), 2, 'options available');
    });

    it('should return 0 participation', async function () {
      const participation = await votingCore.participation(0);
      assert.equal(participation.toNumber(), 0, 'participation');
    });

    it('should return a creation date', async function () {
      const createdAt = await votingCore.proposalCreatedAt(0);
      assert.ok(createdAt > before, 'createdAt');
    });

    it('should return empty ballot', async function () {
      const ballot = (await votingCore.ballot(0))
        .map((value) => value.toNumber());
      assert.deepEqual(ballot, [0, 0, 0], 'ballot');
    });

    it('should return no option voted for any user', async function () {
      const optionVoted = await votingCore.optionVoted(0, accounts[1]);
      assert.equal(optionVoted, 0, 'optionVoted');
    });

    it('should let account0 vote for a proposal', async function () {
      await votingCore.vote(0, 1);
      const ballot = (await votingCore.ballot(0))
        .map((value) => value.toNumber());
      assert.deepEqual(ballot, [0, 1, 0], 'ballot');
      const participation = await votingCore.participation(0);
      assert.equal(participation.toNumber(), 1, 'participation');
      const vote = await votingCore.optionVoted(0, accounts[0]);
      assert.equal(vote, 1, 'vote');
    });

    it('should throw if account1 vote outside available options', async function () {
      await assertRevert(votingCore.vote(0, 3), 'VC04');

      const participation = await votingCore.participation(0);
      assert.equal(participation, 0, 'participation');
    });

    it('should let account0 change his vote', async function () {
      await votingCore.vote(0, 1);
      await votingCore.vote(0, 2);

      const ballot = (await votingCore.ballot(0))
        .map((value) => value.toNumber());
      assert.deepEqual(ballot, [0, 0, 1], 'ballot');
      const participation = await votingCore.participation(0);
      assert.equal(participation.toNumber(), 1, 'participation');
      const vote = await votingCore.optionVoted(0, accounts[0]);
      assert.equal(vote, 2, 'vote');
    });

    it('should let account0 to cancel vote', async function () {
      await votingCore.vote(0, 1);
      await votingCore.vote(0, 0);

      const ballot = (await votingCore.ballot(0))
        .map((value) => value.toNumber());
      assert.deepEqual(ballot, [1, 0, 0], 'ballot');
      const participation = await votingCore.participation(0);
      assert.equal(participation.toNumber(), 1, 'participation');
      const vote = await votingCore.optionVoted(0, accounts[0]);
      assert.equal(vote, 0, 'vote');
    });

    it('should let owner add a proposal', async function () {
      const receipt = await votingCore.addProposal(expectedQuestion, expectedUrl, expectedHash, 10);
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'ProposalAdded');
      assert.equal(receipt.logs[0].args.proposalId, 2);

      const count = await votingCore.proposalsCount();
      assert.equal(count, 3, 'count');
    });
  });
});
