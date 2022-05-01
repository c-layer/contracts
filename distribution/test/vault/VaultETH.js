'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Vault = artifacts.require('vault/VaultETH.sol');

contract('VaultETH', function (accounts) {
  let vault;

  beforeEach(async function () {
    vault = await Vault.new();
  });

  it('should have a owner', async function () {
    const owner = await vault.owner();
    assert.equal(owner, accounts[0], 'owner');
  });

  it('should have vault creator as operator', async function () {
    const isOperator = await vault.isOperator(accounts[0]);
    assert.ok(isOperator, 'operator');
  });

  it('should have no ETH', async function () {
    const value = await web3.eth.getBalance(vault.address);
    assert.equal(value.toString(), '0');
  });

  it('should receive ETH', async function () {
    const tx = await web3.eth.sendTransaction({ from: accounts[0], to: vault.address, value: '1' });
    assert.ok(tx.status, 'Status');
  });

  it('should receive ETH with data', async function () {
    const tx = await web3.eth.sendTransaction(
      { from: accounts[0], to: vault.address, value: '1', data: '0x123456' });
    assert.ok(tx.status, 'Status');
  });

  describe('With some ETH', function () {
    beforeEach(async function () {
      await web3.eth.sendTransaction({ from: accounts[0], to: vault.address, value: '1' });
    });

    it('should have some ETH', async function () {
      const value = await web3.eth.getBalance(vault.address);
      assert.equal(value.toString(), '1');
    });

    it('should let operator send ETH', async function () {
      const tx = await vault.transfer(accounts[0], '1', '0x');
      assert.ok(tx.receipt.status, 'Status');

      const value = await web3.eth.getBalance(vault.address);
      assert.equal(value.toString(), '0', 'value');
    });

    it('should prevent non operator to send ETH', async function () {
      await assertRevert(vault.transfer(accounts[0], '1', '0x', { from: accounts[1] }), 'OP01');
    });
  });
});
