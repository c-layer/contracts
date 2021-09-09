'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const MintableTokenERC20 = artifacts.require('MintableTokenERC20.sol');
const WrappedToken = artifacts.require('WrappedToken.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';
const AMOUNTS = [ '10000', '20000', '30000' ];

const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);
const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

contract('WrappedToken', function (accounts) {
  const RECIPIENTS = [ accounts[2], accounts[3], accounts[4] ];
  let token, wrapped;

  beforeEach(async function () {
    token = await MintableTokenERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
    wrapped = await WrappedToken.new('w' + NAME, 'w' + SYMBOL, DECIMALS, token.address);

    await token.approve(wrapped.address, TOTAL_SUPPLY);
    await wrapped.deposit(TOTAL_SUPPLY);
  });

  it('should transfer from account 0 to account 1', async function () {
    const tx = await wrapped.transfer(accounts[1], '1000');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
  });

  it('should prevent non operator to define a lock', async function () {
    await assertRevert(wrapped.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR,
      { from: accounts[1] }), 'OP01');
  });

  it('should let define a lock', async function () {
    const tx = await wrapped.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
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
      await wrapped.defineLock(
        ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should prevent a transfer from account 0 to account 1', async function () {
      await assertRevert(wrapped.transfer(accounts[1], '1000'), 'WT01');
    });
  });

  it('should distribute tokens from self to 3 accounts', async function () {
    const tx = await wrapped.distribute(accounts[0], RECIPIENTS, AMOUNTS);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 3);
    for (let i = 0; i < tx.logs.length; i++) {
      assert.equal(tx.logs[i].event, 'Transfer', 'event');
      assert.equal(tx.logs[i].args.from, accounts[0], 'from');
      assert.equal(tx.logs[i].args.to, RECIPIENTS[i], 'to');
      assert.equal(tx.logs[i].args.value, AMOUNTS[i], 'values');
    }
  });
});
