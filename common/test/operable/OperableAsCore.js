'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const OperableAsCoreMock = artifacts.require('OperableAsCoreMock.sol');
const OperableCoreMock = artifacts.require('OperableCoreMock.sol');
const Proxy = artifacts.require('Proxy.sol');

contract('OperableAsCore', function (accounts) {
  let contract, core, proxy;

  beforeEach(async function () {
    contract = await OperableAsCoreMock.new();
    core = await OperableCoreMock.new([ accounts[1] ]);
    proxy = await Proxy.new(core.address);
  });

  it('should let core operator access', async function () {
    const success = await contract.testOnlyCoreOperator(
      core.address, { from: accounts[1] });
    assert.ok(success, 'success');
  });

  it('shouldd prevent non core operator access', async function () {
    await assertRevert(contract.testOnlyCoreOperator(
      core.address, { from: accounts[2] }));
  });

  it('should let proxy operator access', async function () {
    const success = await contract.testOnlyProxyOperator(
      proxy.address, { from: accounts[1] });
    assert.ok(success, 'success');
  });

  it('should prevent non proxy operator access', async function () {
    await assertRevert(contract.testOnlyProxyOperator(
      proxy.address, { from: accounts[2] }));
  });
});
