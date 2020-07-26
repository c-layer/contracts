'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const DistributionCore = artifacts.require('DistributionCore.sol');
const DistributionProxy = artifacts.require('DistributionProxy.sol');
const FaucetDistributionDelegate = artifacts.require('FaucetDistributionDelegate.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('DistributionCore', function (accounts) {
  let core, delegate, distribution, token;

  beforeEach(async function () {
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
    core = await DistributionCore.new('Name', [accounts[0]]);
    delegate = await FaucetDistributionDelegate.new();

    distribution = await DistributionProxy.new(core.address);
  });

  it('should have a name', async function () {
    const name = await core.name();
    assert.equal(name, 'Name', 'name');
  });

  it('should have a distribution count', async function () {
    const count = await core.distributionCount();
    assert.equal(count.toString(), '0', 'count');
  });

  it('should define a distribution delegate', async function () {
    const tx = await core.defineDistributionDelegate(1, delegate.address);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs[0].event, 'DistributionDelegateDefined', 'events');
    assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
    assert.equal(tx.logs[0].args.delegate, delegate.address, 'delegate');
  });

  describe('With a distribution delegate defined', function () {
    beforeEach(async function () {
      await core.defineDistributionDelegate(1, delegate.address);
    });

    it('should define a distribution', async function () {
      const tx = await core.defineDistribution(distribution.address, 1, accounts[0], token.address);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs[0].event, 'DistributionDefined', 'events');
      assert.equal(tx.logs[0].args.distribution, distribution.address, 'distribution');
      assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
      assert.equal(tx.logs[0].args.vault, accounts[0], 'vault');
      assert.equal(tx.logs[0].args.token, token.address, 'token');
    });

    it('should remove a distribution delegate', async function () {
      const tx = await core.defineDistributionDelegate(1, NULL_ADDRESS);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs[0].event, 'DistributionDelegateRemoved', 'events');
      assert.equal(tx.logs[0].args.delegateId, 1, 'delegateId');
    });
  });
});
