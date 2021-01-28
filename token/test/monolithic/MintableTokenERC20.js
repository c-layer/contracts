'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const MintableTokenERC20 = artifacts.require('MintableTokenERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('MintableTokenERC20', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await MintableTokenERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it('should not have minting finished', async function () {
    const mintingFinished = await token.mintingFinished();
    assert.ok(!mintingFinished, 'minting finished');
  });

  it('should have all time minted', async function () {
    const allTimeMinted = await token.allTimeMinted();
    assert.equal(allTimeMinted, TOTAL_SUPPLY, 'allTimeMinted');
  });

  it('should prevent non owner to mint tokens', async function () {
    await assertRevert(token.mint([accounts[1]], ['100000000'], { from: accounts[1] }), 'OW01');
  });

  it('should let owner mint more tokens', async function () {
    const tx = await token.mint([accounts[1]], ['1000']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, NULL_ADDRESS, 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
    assert.equal(tx.logs[1].event, 'Mint', 'event');
    assert.equal(tx.logs[1].args.to, accounts[1], 'to');
    assert.equal(tx.logs[1].args.value, '1000', 'value');
  });

  it('should prevent non owner to burn tokens', async function () {
    await assertRevert(token.burn('100000000', { from: accounts[1] }), 'OW01');
  });

  it('should let owner burn some tokens', async function () {
    const tx = await token.burn('1000');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, NULL_ADDRESS, 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
    assert.equal(tx.logs[1].event, 'Burn', 'event');
    assert.equal(tx.logs[1].args.from, accounts[0], 'to');
    assert.equal(tx.logs[1].args.value, '1000', 'value');
  });

  it('should prevent non owner to finish minting', async function () {
    await assertRevert(token.finishMinting({ from: accounts[1] }), 'OW01');
  });

  it('should let owner finish minting', async function () {
    const tx = await token.finishMinting();
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'FinishMinting', 'event');
  });

  describe('with minting finished', function () {
    beforeEach(async function () {
      await token.finishMinting();
    });

    it('should prevent owner to mint tokens', async function () {
      await assertRevert(token.mint([accounts[1]], ['100000000']), 'MT01');
    });

    it('should prevent owner to finish minting', async function () {
      await assertRevert(token.finishMinting(), 'MT01');
    });
  });
});
