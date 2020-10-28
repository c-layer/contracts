'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const SimpleVaultERC20 = artifacts.require('SimpleVaultERC20.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const TRANSFER_LOG = web3.utils.sha3('Transfer(address,address,uint256)');

const formatAddressToTopic = address =>
  ('0x' + (address.toLowerCase().substr(2).padStart(64, '0')));
const formatValueToData = value =>
  ('0x' + (value.substr(2).padStart(64, '0')));

contract('SimpleVaultERC20', function (accounts) {
  let vault, token;

  beforeEach(async function () {
    vault = await SimpleVaultERC20.new();
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
  });

  it('should receive ERC20', async function () {
    const tx = await token.transfer(vault.address, '1000', { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[1], 'from');
    assert.equal(tx.logs[0].args.to, vault.address, 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  it('should not receive ETH', async function () {
    await assertRevert(web3.eth.sendTransaction({ from: accounts[0], to: vault.address, value: '1' }));
  });

  describe('With some ERC20', function () {
    beforeEach(async function () {
      await token.transfer(vault.address, '1000', { from: accounts[1] });
    });

    it('should have some tokens', async function () {
      const value = await token.balanceOf(vault.address);
      assert.equal(value.toString(), '1000');
    });

    it('should let operator send ERC20', async function () {
      const tx = await vault.transfer(token.address, accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non owner to send ERC20', async function () {
      await assertRevert(vault.transfer(token.address, accounts[0], '1000', { from: accounts[1] }), 'OW01');
    });
  });
});
