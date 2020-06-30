'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 */

/* const assertRevert = require('../helpers/assertRevert');
const TokenizedVoting = artifacts.require('voting/TokenizedVoting.sol');
const TokenERC20Mock = artifacts.require('mock/TokenERC20Mock.sol');
*/

contract('TokenizedVoting', function (accounts) {
  /* let tokenizedVoting;
  let token;

  const expectedQuestion = 'Would you like to vote ?';
  const expectedHash = web3.utils.sha3('alphabet', { encoding: 'hex' });
  const expectedUrl = 'http://url.url'; */
/*
  beforeEach(async function () {
    //token = await TokenERC20Mock.new(accounts[0], 10000, [], [], []);
    //await token.transfer(accounts[1], 200);
    tokenizedVoting = await TokenizedVoting.new(token.address);
  });

  it('should be possible to access the token', async function () {
    const tokenizedAddress = await tokenizedVoting.token();
    assert.equal(tokenizedAddress, token.address, 'token');
  });

  describe('with a vote on going and account1 having 200 token and no proof of ownership', function () {
    beforeEach(async function () {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      tokenizedVoting = await TokenizedVoting.new(token.address);
      await tokenizedVoting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
    });

    it('should have 200 votes available', async function () {
      const votesAvailable = await tokenizedVoting.votesAvailable(0, accounts[1]);
      assert.equal(votesAvailable.toNumber(), 200, 'votes available');
    });

    it('should have no votes available with proof of ownership', async function () {
      const votesAvailable = await tokenizedVoting.votesAvailableWithProof(0, accounts[1], 10);
      assert.equal(votesAvailable.toNumber(), 0, 'votes available');
    });

    it('should be possible to vote with the balance', async function () {
      await tokenizedVoting.vote(0, 1, { from: accounts[1] });
      const optionVoted = await tokenizedVoting.optionVoted(0, accounts[1]);
      assert.equal(optionVoted, 1, 'optionVoted');
      const ballot = (await tokenizedVoting.ballot(0))[1];
      assert.equal(ballot.toNumber(), 200, 'ballot');
    });

    it('should not be possible to vote with a proof of ownership', async function () {
      await assertRevert(tokenizedVoting.voteWithProof(0, 1, 0));
    });
  });

  describe('with a vote on going and account1 having 200 tokens in a proof of ownership but only 100 in balance',
    function () {
      beforeEach(async function () {
        await tokenizedVoting.addProposal(expectedQuestion, expectedUrl, expectedHash, 2);
        await token.createProof(accounts[1]);
        await token.transfer(accounts[2], 100, { from: accounts[1] });
      });

      it('should have no votes available with balance', async function () {
        const votesAvailable = await tokenizedVoting.votesAvailable(0, accounts[1]);
        assert.equal(votesAvailable.toNumber(), 0, 'votes available');
      });

      it('should have 200 votes available with proof of ownership', async function () {
        const votesAvailable = await tokenizedVoting.votesAvailableWithProof(0, accounts[1], 0);
        assert.equal(votesAvailable.toNumber(), 200, 'votes available');
      });

      it('should not be possible to vote with the balance', async function () {
        await assertRevert(tokenizedVoting.vote(0, 1, { from: accounts[1] }));
      });

      it('should be possible to vote with a proof of ownership', async function () {
        await tokenizedVoting.voteWithProof(0, 1, 0, { from: accounts[1] });
        const optionVoted = await tokenizedVoting.optionVoted(0, accounts[1]);
        assert.equal(optionVoted, 1, 'optionVoted');
        const ballot = (await tokenizedVoting.ballot(0))[1];
        assert.equal(ballot.toNumber(), 200, 'ballot');
      });
    });
    */
});
