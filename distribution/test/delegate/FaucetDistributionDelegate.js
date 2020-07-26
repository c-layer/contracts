'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

// const assertRevert = require('../helpers/assertRevert');
const DistributionCore = artifacts.require('DistributionCore.sol');
const DistributionProxy = artifacts.require('DistributionProxy.sol');
const FaucetDistributionDelegate = artifacts.require('FaucetDistributionDelegate.sol');
const Vault = artifacts.require('Vault.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

contract('FaucetDistributionDelegate', function (accounts) {
  let core, delegate, distribution, vault, token;

  beforeEach(async function () {
    vault = await Vault.new();
    token = await Token.new('Name', 'Symbol', 0, vault.address, 1000000);
    core = await DistributionCore.new('Name', [accounts[0]]);
    delegate = await FaucetDistributionDelegate.new();

    await core.defineDistributionDelegate(1, delegate.address);
    await vault.defineOperator('Core', core.address);

    distribution = await DistributionProxy.new(core.address);
    await core.defineDistribution(distribution.address, 1, vault.address, token.address);
  });

  it('should withdraw tokens', async function () {
    const tx = await distribution.withdraw('1000');
    assert.ok(tx.receipt.status, 'Status');
    // assert.equal(tx.logs[0].event, 'DistributionDefined', 'events');
    // assert.equal(tx.logs[0].args.distribution, distribution.address, 'distribution');
    // assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
    // assert.equal(tx.logs[0].args.vault, accounts[0], 'vault');
    // assert.equal(tx.logs[0].args.token, token.address, 'token');
  });

  it('should distribute tokens', async function () {
    const tx = await core.distribute(distribution.address, accounts[0], '1000');
    assert.ok(tx.receipt.status, 'Status');
    // assert.equal(tx.logs[0].event, 'DistributionDefined', 'events');
    // assert.equal(tx.logs[0].args.distribution, distribution.address, 'distribution');
    // assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
    // assert.equal(tx.logs[0].args.vault, accounts[0], 'vault');
    // assert.equal(tx.logs[0].args.token, token.address, 'token');
  });

  it('should distribute tokens to many investors', async function () {
    const tx = await core.distributeMany(distribution.address, [accounts[0], accounts[1]], ['1000', '1000']);
    assert.ok(tx.receipt.status, 'Status');
    // assert.equal(tx.logs[0].event, 'DistributionDefined', 'events');
    // assert.equal(tx.logs[0].args.distribution, distribution.address, 'distribution');
    // assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
    // assert.equal(tx.logs[0].args.vault, accounts[0], 'vault');
    // assert.equal(tx.logs[0].args.token, token.address, 'token');
  });
});
