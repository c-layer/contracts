'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Vault = artifacts.require('vault/VaultERC20.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const TRANSFER_LOG = web3.utils.sha3('Transfer(address,address,uint256)');
const APPROVAL_LOG = web3.utils.sha3('Approval(address,address,uint256)');

const formatAddressToTopic = address =>
  ('0x' + (address.toLowerCase().substr(2).padStart(64, '0')));
const formatValueToData = value =>
  ('0x' + (value.substr(2).padStart(64, '0')));

contract('VaultERC20', function (accounts) {
  let vault, token;

  beforeEach(async function () {
    vault = await Vault.new();
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
  });

  it('should have a owner', async function () {
    const owner = await vault.owner();
    assert.equal(owner, accounts[0], 'owner');
  });

  it('should have vault creator as operator', async function () {
    const isOperator = await vault.isOperator(accounts[0]);
    assert.ok(isOperator, 'operator');
  });

  it('should have no tokens', async function () {
    const value = await token.balanceOf(vault.address);
    assert.equal(value.toString(), '0');
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

  describe('With some ERC20', function () {
    beforeEach(async function () {
      await token.transfer(vault.address, '1000', { from: accounts[1] });
    });

    it('should have no tokens', async function () {
      const value = await token.balanceOf(vault.address);
      assert.equal(value.toString(), '1000');
    });

    it('should let operator send tokens', async function () {
      const tx = await vault.transferERC20(token.address, accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non operator to send ERC20', async function () {
      await assertRevert(vault.transferERC20(token.address, accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });

    it('should let operator approve a spender', async function () {
      const tx = await vault.approveERC20(token.address, accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non operator to approve a spender', async function () {
      await assertRevert(vault.approveERC20(token.address, accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });

    describe('and some ERC20 approvals', function () {
      beforeEach(async function () {
        await vault.approveERC20(token.address, accounts[0], '1000');
      });

      it('should let operator increase spender approval', async function () {
        const tx = await vault.increaseApprovalERC20(token.address, accounts[0], '100');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1100)), 'value');
      });

      it('should prevent non operator to increase spender approval', async function () {
        await assertRevert(vault.increaseApprovalERC20(token.address, accounts[0], '100', { from: accounts[1] }), 'OP01');
      });

      it('should let operator decrease spender approval', async function () {
        const tx = await vault.decreaseApprovalERC20(token.address, accounts[0], '100');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(900)), 'value');
      });

      it('should prevent non operator to decrease spender approval', async function () {
        await assertRevert(vault.decreaseApprovalERC20(token.address, accounts[0], '100', { from: accounts[1] }), 'OP01');
      });
    });
  });

  describe('With an approval on accounts[1]', function () {
    beforeEach(async function () {
      await token.approve(vault.address, '1000', { from: accounts[1] });
    });

    it('should let operator transfer from accounts[1] tokens', async function () {
      const tx = await vault.transferFromERC20(token.address,
        accounts[1], accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 2, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'event');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(accounts[1]), 'owner');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(vault.address), 'spender');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(0)), 'value');
      assert.equal(tx.receipt.rawLogs[1].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[1].topics[1], formatAddressToTopic(accounts[1]), 'from');
      assert.equal(tx.receipt.rawLogs[1].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[1].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non operator to transfer accounts[1] token', async function () {
      await assertRevert(vault.transferFromERC20(token.address,
        accounts[1], accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });
  });
});
