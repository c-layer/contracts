'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Vault = artifacts.require('vault/Vault.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const TRANSFER_LOG = web3.utils.sha3('Transfer(address,address,uint256)');
const APPROVAL_LOG = web3.utils.sha3('Approval(address,address,uint256)');

const formatAddressToTopic = address =>
  ('0x' + (address.toLowerCase().substr(2).padStart(64, '0')));
const formatValueToData = value =>
  ('0x' + (value.substr(2).padStart(64, '0')));

contract('Vault', function (accounts) {
  let vault, token;

  beforeEach(async function () {
    vault = await Vault.new(accounts[1]);
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
  });

  it('should have a owner', async function () {
    const owner = await vault.owner();
    assert.equal(owner, accounts[1], 'owner');
  });

  it('should have vault creator as operator', async function () {
    const isOperator = await vault.isOperator(accounts[0]);
    assert.ok(isOperator, 'operator');
  });

  it('should have no ETH', async function () {
    const value = await web3.eth.getBalance(vault.address);
    assert.equal(value.toString(), '0');
  });

  it('should have no tokens', async function () {
    const value = await token.balanceOf(vault.address);
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

  it('should receive ERC20', async function () {
    const tx = await token.transfer(vault.address, '1000', { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[1], 'from');
    assert.equal(tx.logs[0].args.to, vault.address, 'to');
    assert.equal(tx.logs[0].args.value, '1000', 'value');
  });

  describe('With some ETH and ERC20', function () {
    beforeEach(async function () {
      await web3.eth.sendTransaction({ from: accounts[0], to: vault.address, value: '1' });
      await token.transfer(vault.address, '1000', { from: accounts[1] });
    });

    it('should have some ETH', async function () {
      const value = await web3.eth.getBalance(vault.address);
      assert.equal(value.toString(), '1');
    });

    it('should have no tokens', async function () {
      const value = await token.balanceOf(vault.address);
      assert.equal(value.toString(), '1000');
    });

    it('should let operator send ETH', async function () {
      const tx = await vault.transferETH(accounts[0], '1', '0x');
      assert.ok(tx.receipt.status, 'Status');

      const value = await web3.eth.getBalance(vault.address);
      assert.equal(value.toString(), '0', 'value');
    });

    it('should prevent non operator to send ETH', async function () {
      await assertRevert(vault.transferETH(accounts[0], '1', '0x', { from: accounts[1] }), 'OP01');
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

    it('should prevent non operator to send ERC20', async function () {
      await assertRevert(vault.transfer(token.address, accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });

    it('should let operator approve a spender', async function () {
      const tx = await vault.approve(token.address, accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non operator to approve a spender', async function () {
      await assertRevert(vault.approve(token.address, accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });

    describe('and some approvals', function () {
      beforeEach(async function () {
        await vault.approve(token.address, accounts[0], '1000');
      });

      it('should let operator increase spender approval', async function () {
        const tx = await vault.increaseApproval(token.address, accounts[0], '100');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1100)), 'value');
      });

      it('should prevent non operator to increase spender approval', async function () {
        await assertRevert(vault.increaseApproval(token.address, accounts[0], '100', { from: accounts[1] }), 'OP01');
      });

      it('should let operator decrease spender approval', async function () {
        const tx = await vault.decreaseApproval(token.address, accounts[0], '100');
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(900)), 'value');
      });

      it('should prevent non operator to decrease spender approval', async function () {
        await assertRevert(vault.decreaseApproval(token.address, accounts[0], '100', { from: accounts[1] }), 'OP01');
      });
    });

    it('should execute binary call', async function () {
      const request = token.contract.methods.transfer(accounts[0], '1000').encodeABI();

      const tx = await vault.transferETH(token.address, '0', request);
      assert.ok(tx.receipt.status, 'Status');

      const logs = await token.getPastEvents('allEvents', {
        fromBlock: tx.receipt.blockNumber,
        toBlock: tx.receipt.blockNumber,
      });
      assert.equal(logs.length, 1);
      assert.equal(logs[0].event, 'Transfer', 'event');
      assert.equal(logs[0].args.from, vault.address, 'from');
      assert.equal(logs[0].args.to, accounts[0], 'to');
      assert.equal(logs[0].args.value, '1000', 'value');
    });

    it('should prevent non operator to execute binary call', async function () {
      const request = vault.contract.methods.transfer(token.address, accounts[0], '1000').encodeABI();
      await assertRevert(vault.transferETH(vault.address, '0', request, { from: accounts[1] }), 'OP01');
    });
  });

  describe('With an approval on accounts[1]', function () {
    beforeEach(async function () {
      await token.approve(vault.address, '1000', { from: accounts[1] });
    });

    it('should let operator transfer from accounts[1] tokens', async function () {
      const tx = await vault.transferFrom(token.address,
        accounts[1], accounts[0], '1000');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(accounts[1]), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(1000)), 'value');
    });

    it('should prevent non operator to transfer accounts[1] token', async function () {
      await assertRevert(vault.transferFrom(token.address,
        accounts[1], accounts[0], '1000', { from: accounts[1] }), 'OP01');
    });
  });
});
