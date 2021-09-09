'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const LockableERC20 = artifacts.require('LockableERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';

const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);
const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

contract('LockableERC20', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await LockableERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it('should transfer from account 0 to account 1', async function () {
    const tx = await token.transfer(accounts[1], '1000');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
  });

  it('should prevent non operator to define a lock', async function () {
    await assertRevert(token.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR,
      { from: accounts[1] }), 'OP01');
  });

  it('should let define a lock', async function () {
    const tx = await token.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'LockDefined', 'event');
    assert.equal(tx.logs[0].args.sender, ANY_ADDRESSES, 'sender');
    assert.equal(tx.logs[0].args.receiver, ANY_ADDRESSES, 'receiver');
    assert.equal(tx.logs[0].args.startAt, PREVIOUS_YEAR, 'startAt');
    assert.equal(tx.logs[0].args.endAt, NEXT_YEAR, 'endAt');
  });

  describe('With a token lock defined in the present', function () {
    beforeEach(async function () {
      await token.defineLock(
        ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should prevent a transfer from account 0 to account 1', async function () {
      await assertRevert(token.transfer(accounts[1], '1000'), 'LE01');
    });
  });
});
