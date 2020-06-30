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
const Voting = artifacts.require('voting/Voting.sol');

contract('Voting', function (accounts) {
  let voting;
  const expectedQuestion = 'Would you like to vote ?';
  const expectedHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const expectedUrl = 'http://url.url';

  const time2WeeksInSec = 3600 * 24 * 7 * 2;

  beforeEach(async function () {
    voting = await Voting.new();
  });

  describe('without any proposals', function () {
    it('should return 2 weeks for default rule duration', async function () {
      const duration = await voting.defaultDuration();
      assert.equal(duration, time2WeeksInSec, 'defaultDuration');
    });

    it('should return 0 for default rule quorum', async function () {
      const defaultQuorum = await voting.defaultQuorum();
      assert.equal(defaultQuorum, 0, 'defaultQuorum');
    });

    it('should return 0 for rule min relative majority', async function () {
      const defaultMinScore = await voting.defaultMinScore();
      assert.equal(defaultMinScore, 0, 'defaultMinScore');
    });

    it('should return there are no on going votes', async function () {
      const areOnGoing = await voting.areAnyOnGoing();
      assert.ok(!areOnGoing, 'areOnGoing');
    });
  });

  describe('with one proposal and default rule', function () {
    beforeEach(async function () {
      await voting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
    });

    it('should return is on going for vote0', async function () {
      const isOnGoing = await voting.isOnGoing(0);
      assert.ok(isOnGoing, 'isOnGoing');
    });

    it('should return there are on going votes', async function () {
      const areOnGoing = await voting.areAnyOnGoing();
      assert.ok(areOnGoing, 'areOnGoing');
    });

    it('should return 2 weeks for vote0 duration', async function () {
      const duration = await voting.voteDuration(0);
      assert.equal(duration, time2WeeksInSec, 'duration');
    });

    it('should return 0 for vote0 quorum', async function () {
      const quorum = await voting.voteQuorum(0);
      assert.equal(quorum, 0, 'quorum');
    });

    it('should return 0 for vote0 min score', async function () {
      const minScore = await voting.voteMinScore(0);
      assert.equal(minScore, 0, 'minScore');
    });

    it('should return latestVotingTime equal to vote1 creation time', async function () {
      const latestVotingTime = await voting.latestVotingTime();
      const createdAt = await voting.proposalCreatedAt(0);

      assert.equal(latestVotingTime.toNumber(), createdAt.toNumber() + time2WeeksInSec, 'latestVotingTime');
    });

    it('should allow voting', async function () {
      await voting.vote(0, 1);
      const participation = await voting.participation(0);
      assert.equal(participation.toNumber(), 1, 'participation');
    });

    it('should have result failing', async function () {
      await assertRevert(voting.result(0), 'VO01');
    });

    it('should allow updating voting rules', async function () {
      const receipt = await voting.updateVotingRule(0, 10, 10);
      assert.equal(receipt.logs.length, 1);
      assert.equal(receipt.logs[0].event, 'VotingRuleUpdated');
      assert.equal(receipt.logs[0].args.duration, 0);
      assert.equal(receipt.logs[0].args.quorum, 10);
      assert.equal(receipt.logs[0].args.minScore, 10);

      const duration = await voting.defaultDuration();
      assert.equal(duration, 0, 'duration');
      const quorum = await voting.defaultQuorum();
      assert.equal(quorum, 10, 'quorum');
      const minScore = await voting.defaultMinScore();
      assert.equal(minScore, 10, 'minScore');
    });

    it('should let owner close vote 0', async function () {
      await voting.closeVote(0);
      const isOnGoing = await voting.isOnGoing(0);
      assert.ok(!isOnGoing, 'isOnGoing');
    });
  });

  describe('with one proposals with duration = 0', function () {
    beforeEach(async function () {
      await voting.updateVotingRule(0, 0, 0);
      await voting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
    });

    it('should not allow any votes', async function () {
      await assertRevert(voting.vote(0, 1), 'VO02');
    });

    it('should not have the proposal on going', async function () {
      const isOnGoing = await voting.isOnGoing(0);
      assert.ok(!isOnGoing, 'isOngoing');
    });

    it('should not have any on going', async function () {
      const areAnyOnGoing = await voting.areAnyOnGoing();
      assert.ok(!areAnyOnGoing, 'areAnyOnGoing');
    });

    it('should return result 0', async function () {
      const result = await voting.result(0);
      assert.equal(result, 0, 'result');
    });

    it('should not close the vote', async function () {
      await assertRevert(voting.closeVote(0), 'VO02');
    });
  });

  describe('with one proposals with quorum = 3', function () {
    beforeEach(async function () {
      await voting.updateVotingRule(10, 3, 0);
      await voting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
      await voting.vote(0, 1, { from: accounts[1] });
      await voting.vote(0, 1, { from: accounts[2] });
    });

    it('should have 0 as voting result with 2 participants when the vote is closed', async function () {
      await voting.closeVote(0);
      const result = await voting.result(0);
      assert.equal(result, 0, 'result');
    });

    it('should have 1 as voting result with 3 participants voting 1 when the vote is closed', async function () {
      await voting.vote(0, 1, { from: accounts[3] });
      await voting.closeVote(0);
      const result = await voting.result(0);
      assert.equal(result.toNumber(), 1, 'result');
    });
  });

  describe('with one proposals with minScore = 2)', function () {
    beforeEach(async function () {
      await voting.updateVotingRule(10, 0, 2);
      await voting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
      await voting.vote(0, 1, { from: accounts[1] });
    });

    it('should have 0 as voting result when no motions have 2 votes or more', async function () {
      await voting.closeVote(0);
      const result = await voting.result(0);
      assert.equal(result, 0, 'result');
    });

    it('should have 1 as voting result when 1 has 2 votes', async function () {
      await voting.vote(0, 1, { from: accounts[2] });
      await voting.closeVote(0);
      const result = await voting.result(0);
      assert.equal(result, 1, 'result');
    });
  });
});
