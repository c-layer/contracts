'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const DistributionCore = artifacts.require('DistributionCore.sol');
const DistributionProxy = artifacts.require('DistributionProxy.sol');
const FaucetDistributionDelegate = artifacts.require('FaucetDistributionDelegate.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

contract('DistributionProxy', function (accounts) {
  let core, delegate, proxy, token;

  beforeEach(async function () {
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);

    core = await DistributionCore.new('Name', [accounts[0]]);
    delegate = await FaucetDistributionDelegate.new();

    proxy = await DistributionProxy.new(core.address);
  });

  /* it('should have a base token', async function () {
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
    assert.deepEqual(tx.logs.map((log) => log.event), ['Transfer', 'Deposit'], 'events');
    assert.equal(tx.logs[0].args.from, accounts[1], 'from');
    assert.equal(tx.logs[0].args.to, wToken.address, 'to');
    assert.equal(tx.logs[0].args.value.toString(), 1000, 'value');
    assert.equal(tx.logs[1].args._address, accounts[1], 'address');
    assert.equal(tx.logs[1].args.value.toString(), 1000, 'value');
  }); */
});
