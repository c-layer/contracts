'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const WrappedERC20 = artifacts.require('WrappedERC20.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('WrappedERC20', function (accounts) {
  let wToken, token;

  beforeEach(async function () {
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
    wToken = await WrappedERC20.new('Name', 'Symbol', token.address);

    await token.approve(wToken.address, 1000, { from: accounts[1] });
  });

  it('should have a base token', async function () {
    const baseAddress = await wToken.base();
    assert.equal(baseAddress, token.address, 'token');
  });

  it('should have no wTokens', async function () {
    const value = await wToken.balanceOf(accounts[1]);
    assert.equal(value, 0, 'value');
  });

  it('should deposit some tokens', async function () {
    const tx = await wToken.deposit(1000, { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.deepEqual(tx.logs.map((log) => log.event), ['Transfer', 'Transfer'], 'events');
    assert.equal(tx.logs[0].args.from, accounts[1], 'from');
    assert.equal(tx.logs[0].args.to, wToken.address, 'to');
    assert.equal(tx.logs[0].args.value.toString(), 1000, 'value');
    assert.equal(tx.logs[1].args.from, NULL_ADDRESS, 'from');
    assert.equal(tx.logs[1].args.to, accounts[1], 'to');
    assert.equal(tx.logs[1].args.value.toString(), 1000, 'value');
  });

  it('should not deposit too many tokens', async function () {
    await assertRevert(wToken.deposit(1001, { from: accounts[1] }), 'WE01');
  });

  describe('With some wrapped tokens', function () {
    beforeEach(async function () {
      await wToken.deposit(1000, { from: accounts[1] });
    });

    it('should have some wTokens', async function () {
      const value = await wToken.balanceOf(accounts[1]);
      assert.equal(value, 1000, 'value');
    });

    it('should transfer some wTokens', async function () {
      const tx = await wToken.transfer(accounts[0], 1000, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs[0].event, 'Transfer', 'event');
      assert.equal(tx.logs[0].args.from, accounts[1], 'from');
      assert.equal(tx.logs[0].args.to, accounts[0], 'to');
      assert.equal(tx.logs[0].args.value.toString(), 1000, 'value');
    });

    it('should withdraw some tokens', async function () {
      const tx = await wToken.withdraw(1000, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.deepEqual(tx.logs.map((log) => log.event), ['Transfer', 'Transfer'], 'events');
      assert.equal(tx.logs[0].args.from, accounts[1], 'from');
      assert.equal(tx.logs[0].args.to, NULL_ADDRESS, 'to');
      assert.equal(tx.logs[0].args.value.toString(), 1000, 'value');
      assert.equal(tx.logs[1].args.from, wToken.address, 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.value.toString(), 1000, 'value');
    });

    it('should not withdraw too many tokens', async function () {
      await assertRevert(wToken.withdraw(1001, { from: accounts[1] }), 'WE03');
    });
  });
});
