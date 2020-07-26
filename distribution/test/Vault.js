'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const Vault = artifacts.require('Vault.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');

const ONE_ETHER = web3.utils.toWei('1', 'ether');
 
contract('Vault', function (accounts) {
  let vault, token;

  beforeEach(async function () {
    vault = await Vault.new();
    token = await Token.new('Name', 'Symbol', 0, vault.address, '1000000');

    await web3.eth.sendTransaction({
      from: accounts[0],
      to: vault.address,
      value: ONE_ETHER,
    });
  });

  it('should transfer ETH', async function () {
    const tx =
      await vault.transferETH(accounts[0], web3.utils.toWei('0.1', 'ether'), '0x0');
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should transfer ERC20', async function () {
    const tx =
      await vault.transfer(token.address, accounts[2], '10000');
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should approve ERC20', async function () {
    const tx =
      await vault.approve(token.address, accounts[1], '10000');
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should increase approval', async function () {
    const tx =
      await vault.increaseApproval(token.address, accounts[1], '10000');
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should decrease approval', async function () {
    const tx =
      await vault.decreaseApproval(token.address, accounts[1], '10000');
    assert.ok(tx.receipt.status, 'Status');
  });

  describe('With a first vault transfer to accounts[1]', function () {

    beforeEach(async function () {
      await vault.transfer(token.address, accounts[1], '10000');
      await token.approve(vault.address, '10000', { from: accounts[1] })
    });

    it('should transferFrom ERC20', async function () {
      const tx =
        await vault.transferFrom(token.address, accounts[1], accounts[2], '10000');
      assert.ok(tx.receipt.status, 'Status');
    });
  });
});
