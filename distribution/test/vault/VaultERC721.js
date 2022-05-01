'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const Vault = artifacts.require('vault/VaultERC721.sol');
const Token = artifacts.require('mock/TokenERC721Mock.sol');

const TRANSFER_LOG = web3.utils.sha3('Transfer(address,address,uint256)');
const APPROVAL_LOG = web3.utils.sha3('Approval(address,address,uint256)');
const NULL_ADDRESS = '0x'.padEnd(42, '0');

const formatAddressToTopic = address =>
  ('0x' + (address.toLowerCase().substr(2).padStart(64, '0')));
const formatValueToData = value =>
  ('0x' + (value.substr(2).padStart(64, '0')));

contract('VaultERC721', function (accounts) {
  let vault, token;

  beforeEach(async function () {
    vault = await Vault.new();
    token = await Token.new('Name', 'Symbol', 'uri', '.json', accounts[1], [ 10, 30, 50, 70 ]);
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

  it('should receive ERC721', async function () {
    const tx = await token.transferFrom(accounts[1], vault.address, '10', { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[1], 'from');
    assert.equal(tx.logs[0].args.to, vault.address, 'to');
    assert.equal(tx.logs[0].args.tokenId, '10', 'value');
  });

  describe('With some ERC721', function () {
    beforeEach(async function () {
      await token.transferFrom(accounts[1], vault.address, '10', { from: accounts[1] });
    });

    it('should have one token', async function () {
      const value = await token.balanceOf(vault.address);
      assert.equal(value.toString(), '1');
    });

    it('should be the owner of token id 10', async function () {
      const owner = await token.ownerOf('10');
      assert.equal(owner, vault.address);
    });

    it('should let operator send tokens', async function () {
      const tx = await vault.transferFromERC721(token.address, vault.address, accounts[0], '10');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[0].topics[3], formatValueToData(web3.utils.toHex(10)), 'tokenId');
    });

    it('should prevent non operator to send ERC721', async function () {
      await assertRevert(vault.transferFromERC721(token.address, accounts[1], accounts[0], '10',
        { from: accounts[1] }), 'OP01');
    });

    it('should let operator approve a spender', async function () {
      const tx = await vault.approveERC721(token.address, accounts[0], '10');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(vault.address), 'owner');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'spender');
      assert.equal(tx.receipt.rawLogs[0].topics[3], formatValueToData(web3.utils.toHex(10)), 'tokenId');
    });

    it('should prevent non operator to approve a spender', async function () {
      await assertRevert(vault.approveERC721(token.address, accounts[0], '10', { from: accounts[1] }), 'OP01');
    });
  });

  describe('With an approval on accounts[1]', function () {
    beforeEach(async function () {
      await token.approve(vault.address, '10', { from: accounts[1] });
    });

    it('should let operator transfer from accounts[1] tokens', async function () {
      const tx = await vault.transferFromERC721(token.address,
        accounts[1], accounts[0], '10');
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 2, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], APPROVAL_LOG, 'event');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(accounts[1]), 'owner');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(NULL_ADDRESS), 'spender');
      assert.equal(tx.receipt.rawLogs[0].topics[3], formatValueToData(web3.utils.toHex(10)), 'tokenId');
      assert.equal(tx.receipt.rawLogs[1].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[1].topics[1], formatAddressToTopic(accounts[1]), 'from');
      assert.equal(tx.receipt.rawLogs[1].topics[2], formatAddressToTopic(accounts[0]), 'to');
      assert.equal(tx.receipt.rawLogs[1].topics[3], formatValueToData(web3.utils.toHex(10)), 'tokenId');
    });

    it('should prevent non operator to transfer accounts[1] token', async function () {
      await assertRevert(vault.transferFromERC721(token.address,
        accounts[1], accounts[0], '10', { from: accounts[1] }), 'OP01');
    });
  });
});
