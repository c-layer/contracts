'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const assertGasEstimate = require('./helpers/assertGasEstimate');
const BatchTransfer = artifacts.require('BatchTransfer.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');
const BN = require('bn.js');

const NULL_ADDRESS = '0x'.padEnd(42, '0');
const ETH_TRANSFER_MIN_GAS = '230000';

const GAS_SAFETY_FACTOR_PERCENT = '110';
const TWO_ETH_TRANSFERS_GAS = 128373;
const THREE_ETH_TRANSFERS_GAS = 161442;
const TWO_ERC20_TRANSFERS_GAS = 137970;
const THREE_ERC20_TRANSFERS_GAS = 170097;

contract('BatchTransfer', function (accounts) {
  let batch, vaultETH, emptyAccounts;

  let i = 0;
  const generateNewAddress = (prefix) => (prefix + i++).padEnd(42, '0');

  const methods = {
    transferERC20: web3.utils.sha3('transferERC20(address,address[],uint256[])').substr(0, 10),
    transfer: web3.utils.sha3('transfer(address[],uint256[],uint256)').substr(0, 10),
  };

  const withGasSafetyFactor = (gas) =>
    new BN(gas).mul(new BN(GAS_SAFETY_FACTOR_PERCENT)).div(new BN('100')).toString();

  beforeEach(async function () {
    const prefix = '0x' + Math.floor(Math.random() * 10 ** 16).toString(16);
    emptyAccounts = [0, 1, 2].map((i) => generateNewAddress(prefix));
    vaultETH = generateNewAddress(prefix);

    batch = await BatchTransfer.new(vaultETH, [], []);
  });

  it('should have a vault ETH', async function () {
    const batchVaultETH = await batch.vaultETH();
    assert.equal(batchVaultETH.toLowerCase(), vaultETH, 'vault eth');
  });

  it('should have no ethers in the vault', async function () {
    const vaultETHBalance = await web3.eth.getBalance(vaultETH);
    assert.equal(vaultETHBalance, '0', 'vault balance');
  });

  it('should have fees rates for both transfer methods', async function () {
    const feesRates = await Promise.all([
      batch.feesRate(methods.transferERC20),
      batch.feesRate(methods.transfer),
    ]);
    assert.deepEqual(feesRates.map((f) => f.toString()), ['0', '0'], 'feesRates');
  });

  it('should let owner set fees rates', async function () {
    const tx = await batch.updateFeesRates(vaultETH, [methods.transferERC20], ['1']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1, 'events');
    assert.equal(tx.logs[0].event, 'FeesRateUpdate');
    assert.equal(tx.logs[0].args.method, methods.transferERC20);
    assert.equal(tx.logs[0].args.feesRate, '1');
  });

  it('should let owner set a new wallet', async function () {
    const tx = await batch.updateFeesRates(accounts[0], [], []);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1, 'events');
    assert.equal(tx.logs[0].event, 'VaultUpdate');
    assert.equal(tx.logs[0].args.vaultETH, accounts[0]);
  });

  it('should prevent owner to update fees rate without an undefined vault', async function () {
    await assertRevert(batch.updateFeesRates(NULL_ADDRESS, [], []), 'BT08');
  });

  it('should prevent owner to update fees rate with inconsistent values', async function () {
    await assertRevert(batch.updateFeesRates(vaultETH, [], ['1']), 'BT09');
  });

  it('should not let non owner to update vault', async function () {
    await assertRevert(batch.updateFeesRates(accounts[1], [], [], { from: accounts[1] }), 'OP01');
  });

  describe('With ethers', function () {
    it('should not transfer with inconsitent values', async function () {
      await assertRevert(batch.transfer(
        [emptyAccounts[0]], [1001, 1002], ETH_TRANSFER_MIN_GAS, { from: accounts[1] }), 'BT03');
    });

    it('should not transfer without enought ethers', async function () {
      await assertRevert(batch.transfer(
        [emptyAccounts[0]], [1001], ETH_TRANSFER_MIN_GAS, { from: accounts[1] }), 'BT06');
    });

    it('should distribute some ethers to recipients', async function () {
      const tx = await batch.transfer(
        [emptyAccounts[0], emptyAccounts[1]], [101, 102], ETH_TRANSFER_MIN_GAS, {
          from: accounts[1],
          value: new BN(web3.utils.toWei('1', 'gwei')).add(new BN('203')).toString(),
        });
      assert.ok(tx.receipt.status, 'Status');

      const batchBalance = await web3.eth.getBalance(batch.address);
      assert.equal(batchBalance.toString(), web3.utils.toWei('1', 'gwei'), 'batch contract balance');
      const vaultBalance = await web3.eth.getBalance(vaultETH);
      assert.equal(vaultBalance.toString(), '0', 'vault contract balance');
    });

    it('should have ethers distributed', async function () {
      await batch.transfer(
        [emptyAccounts[0], emptyAccounts[1]], [101, 102], ETH_TRANSFER_MIN_GAS, {
          from: accounts[1],
          value: new BN(web3.utils.toWei('1', 'gwei')).add(new BN('203')).toString(),
        });

      const account0Balance = await web3.eth.getBalance(emptyAccounts[0]);
      assert.equal(account0Balance.toString(), '101', 'account 0 balance');
      const account1Balance = await web3.eth.getBalance(emptyAccounts[1]);
      assert.equal(account1Balance.toString(), '102', 'account 1 balance');
    });

    describe('With a 4000 gas feesRate per transfer', function () {
      beforeEach(async function () {
        await batch.updateFeesRates(vaultETH, [methods.transfer], ['4000']);
      });

      it('should prevent distributing some tokens without fees', async function () {
        await assertRevert(batch.transfer(
          [emptyAccounts[0], emptyAccounts[1]], [101, 102], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: web3.utils.toWei('1', 'gwei'),
          }), 'BT01');
      });

      it('should distribute ethers to recipients', async function () {
        const tx = await batch.transfer(
          [emptyAccounts[0], emptyAccounts[1]], [101, 102], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: web3.utils.toWei('1', 'gwei'),
            gas: withGasSafetyFactor(TWO_ETH_TRANSFERS_GAS),
            value: web3.utils.toWei('1', 'milli'),
          });
        assert.ok(tx.receipt.status, 'Status');

        const account0Balance = await web3.eth.getBalance(emptyAccounts[0]);
        assert.equal(account0Balance.toString(), '101', 'account 2 balance');
        const account1Balance = await web3.eth.getBalance(emptyAccounts[1]);
        assert.equal(account1Balance.toString(), '102', 'account 3 balance');
      });

      it('should transfers all remaining ethers to the vault', async function () {
        const tx1 = await batch.transfer(
          [emptyAccounts[0], emptyAccounts[1]], [101, 102], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: '1',
            value: '1000203',
          });
        assert.ok(tx1.receipt.status, 'Status');

        const balanceBatch1 = await web3.eth.getBalance(batch.address);
        assert.equal(balanceBatch1.toString(), '992000', 'batch balance');
        const balanceVaultETH1 = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH1.toString(), '8000', 'vault');

        const tx2 = await batch.transfer([], [], ETH_TRANSFER_MIN_GAS, {
          from: accounts[1],
          gasPrice: '1',
          value: '0',
        });
        assert.ok(tx2.receipt.status, 'Status');

        const balanceBatch2 = await web3.eth.getBalance(batch.address);
        assert.equal(balanceBatch2.toString(), '0', 'batch balance');
        const balanceVaultETH2 = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH2.toString(), '1000000', 'vault');
      });

      it('should estimate ether transfer to two addresses', async function () {
        const gasEstimate = await batch.transfer.estimateGas(
          [emptyAccounts[0], emptyAccounts[1]], [100, 100], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: 1,
            value: new BN(web3.utils.toWei('1', 'milli')).add(new BN('200')).toString(),
          });

        assertGasEstimate(gasEstimate, TWO_ETH_TRANSFERS_GAS, 'estimate gas');
      });

      it('should transfer to two addresses with the exact fees amount', async function () {
        const gas = withGasSafetyFactor(TWO_ETH_TRANSFERS_GAS);
        const fees = new BN('16000');
        const tx = await batch.transfer(
          [emptyAccounts[0], emptyAccounts[1]], [100, 100], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: 2,
            gas: gas,
            value: fees.add(new BN('200')).toString(),
          });
        assert.ok(tx.receipt.status, 'Status');

        const balanceVaultETH = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH.toString(), fees.toString(), 'vault');
      });

      it('should estimate ether transfer to three addresses', async function () {
        const gasEstimate = await batch.transfer.estimateGas(
          [emptyAccounts[0], emptyAccounts[1], emptyAccounts[2]], [100, 100, 100], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: 1,
            value: new BN(web3.utils.toWei('1', 'ether')).add(new BN('300')).toString(),
          });

        assertGasEstimate(gasEstimate, THREE_ETH_TRANSFERS_GAS, 'estimate gas');
      });

      it('should transfer to three addresses with the exact fees amount', async function () {
        const gas = withGasSafetyFactor(THREE_ETH_TRANSFERS_GAS);
        const fees = new BN('24000');
        const tx = await batch.transfer(
          [emptyAccounts[0], emptyAccounts[1], emptyAccounts[2]], [100, 100, 100], ETH_TRANSFER_MIN_GAS, {
            from: accounts[1],
            gasPrice: 2,
            gas: gas,
            value: fees.add(new BN('300')).toString(),
          });
        assert.ok(tx.receipt.status, 'Status');

        const balanceVaultETH = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH.toString(), fees.toString(), 'vault');
      });
    });
  });

  describe('With tokens', function () {
    let token;

    beforeEach(async function () {
      token = await Token.new('Name', 'Symbol', 0, accounts[1], 1000000);
    });

    it('should not transfer without approval', async function () {
      await assertRevert(batch.transferERC20(token.address,
        [emptyAccounts[0]], [1001], { from: accounts[1] }), 'BT04');
    });

    describe('With an approval from spender to this contract', function () {
      beforeEach(async function () {
        await token.approve(batch.address, 1000, { from: accounts[1] });
      });

      it('should distribute some tokens', async function () {
        const tx = await batch.transferERC20(
          token.address, [emptyAccounts[0], emptyAccounts[1]], [101, 102], { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');

        const account0Balance = await token.balanceOf(emptyAccounts[0]);
        assert.equal(account0Balance.toString(), '101', 'account 0 balance');
        const account1Balance = await token.balanceOf(emptyAccounts[1]);
        assert.equal(account1Balance.toString(), '102', 'account 1 balance');
      });
    });

    describe('With approval and a feesRate', function () {
      beforeEach(async function () {
        await token.approve(batch.address, 1000, { from: accounts[1] });
        await batch.updateFeesRates(vaultETH, [methods.transferERC20], ['4000']);
      });

      it('should prevent distributing some tokens without fees', async function () {
        await assertRevert(batch.transferERC20(
          token.address, [emptyAccounts[0], emptyAccounts[1]], [100, 100], {
            from: accounts[1],
            gasPrice: web3.utils.toWei('1', 'gwei'),
          }), 'BT01');
      });

      it('should transfers all remaining ethers to the vault', async function () {
        const tx1 = await batch.transferERC20(
          token.address, [emptyAccounts[0], emptyAccounts[1]], [101, 102], {
            from: accounts[1],
            gasPrice: '1',
            value: '1000000',
          });
        assert.ok(tx1.receipt.status, 'Status');

        const balanceBatch1 = await web3.eth.getBalance(batch.address);
        assert.equal(balanceBatch1.toString(), '992000', 'batch balance');
        const balanceVaultETH1 = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH1.toString(), '8000', 'vault');

        const tx2 = await batch.transferERC20(token.address, [], [], {
          from: accounts[1],
          gasPrice: '1',
          value: '0',
        });
        assert.ok(tx2.receipt.status, 'Status');

        const balanceBatch2 = await web3.eth.getBalance(batch.address);
        assert.equal(balanceBatch2.toString(), '0', 'batch balance');
        const balanceVaultETH2 = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH2.toString(), '1000000', 'vault');
      });

      it('should estimate token transfer to two addresses', async function () {
        const gasEstimate = await batch.transferERC20.estimateGas(
          token.address, [emptyAccounts[0], emptyAccounts[1]], [100, 100], {
            from: accounts[1],
            gasPrice: 1,
            value: web3.utils.toWei('1', 'ether'),
          });

        assertGasEstimate(gasEstimate, TWO_ERC20_TRANSFERS_GAS, 'estimate gas');
      });

      it('should transfer to two addresses with the exact fees amount', async function () {
        const gas = withGasSafetyFactor(TWO_ERC20_TRANSFERS_GAS);
        const fees = '16000';
        const tx = await batch.transferERC20(
          token.address, [emptyAccounts[0], emptyAccounts[1]], [100, 100], {
            from: accounts[1],
            gasPrice: 2,
            gas: gas,
            value: fees.toString(),
          });
        assert.ok(tx.receipt.status, 'Status');

        const balanceVaultETH = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH.toString(), fees.toString(), 'vault');
      });

      it('should estimate token transfer to three addresses', async function () {
        const gasEstimate = await batch.transferERC20.estimateGas(
          token.address, [emptyAccounts[0], emptyAccounts[1], emptyAccounts[2]], [100, 100, 100], {
            from: accounts[1],
            gasPrice: 1,
            value: web3.utils.toWei('1', 'ether'),
          });

        assertGasEstimate(gasEstimate, THREE_ERC20_TRANSFERS_GAS, 'estimate gas');
      });

      it('should transfer to three addresses with the exact fees amount', async function () {
        const gas = withGasSafetyFactor(THREE_ERC20_TRANSFERS_GAS);
        const fees = '24000';
        const tx = await batch.transferERC20(
          token.address, [emptyAccounts[0], emptyAccounts[1], emptyAccounts[2]], [100, 100, 100], {
            from: accounts[1],
            gasPrice: 2,
            gas: gas,
            value: fees.toString(),
          });
        assert.ok(tx.receipt.status, 'Status');

        const balanceVaultETH = await web3.eth.getBalance(vaultETH);
        assert.equal(balanceVaultETH.toString(), fees.toString(), 'vault');
      });
    });
  });
});
