'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const BatchTransferERC20 = artifacts.require('BatchTransferERC20.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');
const BN = require('bn.js');

const NULL_ADDRESS = '0x'.padEnd(42, '0');
const TWO_TRANSFERS_FEES = '3507340000000';
const THREE_TRANSFERS_FEES = '3496940000000';

contract('BatchTransferERC20', function (accounts) {
  let batch, token;

  const VAULT_ETH = accounts[5];

  beforeEach(async function () {
    token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
    batch = await BatchTransferERC20.new(VAULT_ETH, '0');
  });

  it('should have a vault ETH', async function () {
    const vaultETH = await batch.vaultETH();
    assert.equal(vaultETH, VAULT_ETH, 'vault eth');
  });

  it('should have fees rate', async function () {
    const feesRate = await batch.feesRate();
    assert.equal(feesRate, 0, 'feesRate');
  });

  it('should let owner to remove fees rate', async function () {
    const tx = await batch.updateFees(NULL_ADDRESS, '0');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs[0].event, 'FeesUpdate');
    assert.equal(tx.logs[0].args.vaultETH, NULL_ADDRESS);
    assert.equal(tx.logs[0].args.feesRate, '0');
  });

  it('should prevent owner to update fees rate without a vault', async function () {
    await assertRevert(batch.updateFees(NULL_ADDRESS, '1'), 'BT05');
  });

  it('should not let non owner to update fees rate', async function () {
    await assertRevert(batch.updateFees(accounts[0], '1', { from: accounts[1] }), 'OW01');
  });

  it('should not transfer without approval', async function () {
    await assertRevert(batch.transfer(token.address,
      [accounts[2]], [1001], { from: accounts[1] }), 'TE03');
  });

  it('should not transfer with inconsitent values', async function () {
    await assertRevert(batch.transfer(token.address,
      [accounts[2]], [1001, 1002], { from: accounts[1] }), 'BT03');
  });

  describe('With approval', function () {
    beforeEach(async function () {
      await token.approve(batch.address, 1000, { from: accounts[1] });
    });

    it('should distribute some tokens', async function () {
      const tx = await batch.transfer(
        token.address, [accounts[2], accounts[3]], [100, 100], { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
    });

    describe('With tokens distributed', async function () {
      beforeEach(async function () {
        await batch.transfer(
          token.address, [accounts[2], accounts[3]], [100, 100], { from: accounts[1] });
      });

      it('should have tokens distributed', async function () {
        const account2Balance = await token.balanceOf(accounts[2]);
        assert.equal(account2Balance, 100, 'account 2 balance');
        const account3Balance = await token.balanceOf(accounts[3]);
        assert.equal(account3Balance, 100, 'account 3 balance');
      });
    });
  });

  describe('With approval and a feesRate', function () {
    let balanceVaultETHBefore;

    beforeEach(async function () {
      await token.approve(batch.address, 1000, { from: accounts[1] });
      await batch.updateFees(VAULT_ETH, '20000');

      balanceVaultETHBefore = await web3.eth.getBalance(VAULT_ETH);
    });

    it('should prevent distributing some tokens without fees', async function () {
      await assertRevert(batch.transfer(
        token.address, [accounts[2], accounts[3]], [100, 100],
        {
          from: accounts[1],
          gasPrice: web3.utils.toWei('1', 'gwei'),
          gas: '200000',
        }), 'BT01');
    });

    it('should distribute some tokens', async function () {
      const tx = await batch.transfer(
        token.address, [accounts[2], accounts[3]], [100, 100],
        {
          from: accounts[1],
          gasPrice: web3.utils.toWei('1', 'gwei'),
          gas: '200000',
          value: web3.utils.toWei('1', 'milli'),
        });
      assert.ok(tx.receipt.status, 'Status');
    });

    describe('With tokens distributed to two addresses', async function () {
      beforeEach(async function () {
        await batch.transfer(
          token.address, [accounts[2], accounts[3]], [100, 100],
          {
            from: accounts[1],
            gasPrice: web3.utils.toWei('1', 'gwei'),
            gas: '200000',
            value: web3.utils.toWei('1', 'milli'),
          });
      });

      it('should have tokens distributed', async function () {
        const account2Balance = await token.balanceOf(accounts[2]);
        assert.equal(account2Balance, 100, 'account 2 balance');
        const account3Balance = await token.balanceOf(accounts[3]);
        assert.equal(account3Balance, 100, 'account 3 balance');
      });

      it('should have receive ethers in the vault', async function () {
        const balanceVaultETHAfter = await web3.eth.getBalance(VAULT_ETH);
        const balanceDiff = new BN(balanceVaultETHAfter).sub(new BN(balanceVaultETHBefore));
        assert.equal(balanceDiff.toString(), TWO_TRANSFERS_FEES);
      });
    });

    describe('With tokens distributed to three addresses', async function () {
      beforeEach(async function () {
        await batch.transfer(
          token.address, [accounts[2], accounts[3], accounts[4]], [100, 100, 100],
          {
            from: accounts[1],
            gasPrice: web3.utils.toWei('1', 'gwei'),
            gas: '200000',
            value: web3.utils.toWei('1', 'milli'),
          });
      });

      it('should have tokens distributed', async function () {
        const account2Balance = await token.balanceOf(accounts[2]);
        assert.equal(account2Balance, 100, 'account 2 balance');
        const account3Balance = await token.balanceOf(accounts[3]);
        assert.equal(account3Balance, 100, 'account 3 balance');
        const account4Balance = await token.balanceOf(accounts[4]);
        assert.equal(account4Balance, 100, 'account 4 balance');
      });

      it('should have receive ethers in the vault', async function () {
        const balanceVaultETHAfter = await web3.eth.getBalance(VAULT_ETH);
        const balanceDiff = new BN(balanceVaultETHAfter).sub(new BN(balanceVaultETHBefore));
        assert.equal(balanceDiff.toString(), THREE_TRANSFERS_FEES);
      });
    });
  });
});
