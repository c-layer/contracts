'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const FaucetMock = artifacts.require('mock/FaucetMock.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');
const BN = require('bn.js');

const TRANSFER_LOG = web3.utils.sha3('Transfer(address,address,uint256)');

const formatAddressToTopic = address =>
  ('0x' + (address.toLowerCase().substr(2).padStart(64, '0')));
const formatValueToData = value =>
  ('0x' + (value.substr(2).padStart(64, '0')));

const ALL_TOKENS = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AllTokens').substr(2).padStart(40, '0'));
const NULL_ADDRESS = '0x'.padEnd(42, '0');
const ONE_DAY_PERIOD = 24 * 3600;
const MAX_BALANCE = 5000;

contract('Faucet', function (accounts) {
  let faucet, token;
  let lastAt;

  beforeEach(async function () {
    faucet = await FaucetMock.new(accounts[1]);
    token = await Token.new('Name', 'Symbol', 0, faucet.address, 1000000);
  });

  it('should let operator withdraw tokens without a limit defined', async function () {
    const tx = await faucet.withdraw(token.address, MAX_BALANCE + 1);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
    assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
    assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
    assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[0]), 'to');
    assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5001)), 'value');
  });

  it('should not let non operator withdraw any tokens without a maxBalance defined', async function () {
    await assertRevert(faucet.withdraw(token.address, 1, { from: accounts[1] }), 'FC01');
  });

  it('should prevent non operator to define the token withdraw limit', async function () {
    await assertRevert(faucet.defineWithdrawLimit(
      token.address, MAX_BALANCE, ONE_DAY_PERIOD, { from: accounts[1] }), 'OP01');
  });

  it('should let operator define the token withdraw limit', async function () {
    const tx = await faucet.defineWithdrawLimit(token.address, MAX_BALANCE, ONE_DAY_PERIOD);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'WithdrawLimitUpdate', 'event');
    assert.equal(tx.logs[0].args.token, token.address, 'token');
    assert.equal(tx.logs[0].args.maxBalance, MAX_BALANCE, 'max balance');
    assert.equal(tx.logs[0].args.period, ONE_DAY_PERIOD, 'period');
  });

  describe('With a maxBalance defined', function () {
    beforeEach(async function () {
      await faucet.defineWithdrawLimit(token.address, MAX_BALANCE, 0);
    });

    it('should have a withdraw limit', async function () {
      const limit = await faucet.withdrawLimit(token.address);
      assert.equal(limit.maxBalance.toString(), String(MAX_BALANCE), 'max balance');
      assert.equal(limit.period.toString(), '0', 'period');
    });

    it('should let non operator to withdraw some tokens', async function () {
      const tx = await faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
    });

    it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
      await assertRevert(faucet.withdraw(token.address, MAX_BALANCE + 1, { from: accounts[1] }), 'FC01');
    });

    describe('and some tokens transferred prior', function () {
      beforeEach(async function () {
        await faucet.transferERC20(token.address, accounts[1], 10);
      });

      it('should allow withdrawing some tokens if below maxBalance', async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE - 10, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
      });

      it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
        await assertRevert(faucet.withdraw(token.address, MAX_BALANCE - 9, { from: accounts[1] }), 'FC02');
      });
    });

    describe('and a non operator first withdraw some tokens', function () {
      beforeEach(async function () {
        const tx = await faucet.withdraw(token.address, '10', { from: accounts[1] });
        lastAt = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
      });

      it('should have withdrawer status', async function () {
        const limit = await faucet.withdrawStatus(token.address, accounts[1]);
        assert.equal(limit.recentlyDistributed.toString(), '0', 'recently distributed');
        assert.equal(limit.lastAt.toString(), '0', 'last at');
      });

      it('should have transferred tokens to withdrawer', async function () {
        const balance = await token.balanceOf(accounts[1]);
        assert.equal(balance.toString(), '10', 'balance');
      });

      it('should let withdrawer withdraws again below maxBalance', async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE - 10, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
      });

      it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
        await assertRevert(faucet.withdraw(token.address, MAX_BALANCE - 9, { from: accounts[1] }), 'FC02');
      });
    });
  });

  describe('With a maxBalance and a period defined', function () {
    beforeEach(async function () {
      await faucet.defineWithdrawLimit(token.address, MAX_BALANCE, ONE_DAY_PERIOD);
    });

    it('should have a withdraw limit', async function () {
      const limit = await faucet.withdrawLimit(token.address);
      assert.equal(limit.maxBalance.toString(), MAX_BALANCE, 'max balance');
      assert.equal(limit.period.toString(), ONE_DAY_PERIOD, 'period');
    });

    it('should let non operator to withdraw some tokens', async function () {
      const tx = await faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
    });

    it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
      await assertRevert(faucet.withdraw(token.address, MAX_BALANCE + 1, { from: accounts[1] }), 'FC01');
    });

    describe('and some tokens transferred prior', function () {
      beforeEach(async function () {
        await faucet.transferERC20(token.address, accounts[1], 10);
      });

      it('should allow withdrawing some tokens if below maxBalance', async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE - 10, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
      });

      it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
        await assertRevert(faucet.withdraw(token.address, MAX_BALANCE - 9, { from: accounts[1] }), 'FC02');
      });
    });

    describe('and a non operator first withdraw some tokens', function () {
      beforeEach(async function () {
        const tx = await faucet.withdraw(token.address, 10, { from: accounts[1] });
        lastAt = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
      });

      it('should have withdrawer status', async function () {
        const status_ = await faucet.withdrawStatus(token.address, accounts[1]);
        assert.equal(status_.recentlyDistributed.toString(), '10', 'recently distributed');
        assert.equal(status_.lastAt.toString(), String(lastAt), 'last at');
      });

      it('should have transferred tokens to withdrawer', async function () {
        const balance = await token.balanceOf(accounts[1]);
        assert.equal(balance.toString(), '10', 'balance');
      });

      it('should allow withdrawing some tokens if below maxBalance', async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE - 10, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
      });

      it('should allow withdrawTo some tokens if below maxBalance', async function () {
        const tx = await faucet.withdrawTo(token.address, accounts[2], MAX_BALANCE - 10, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[2]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
      });

      it('should not let withdrawer withdraws maxBalance again too soon', async function () {
        await assertRevert(faucet.withdraw(token.address, MAX_BALANCE - 9, { from: accounts[1] }), 'FC02');
      });

      describe('and sent back the tokens to the faucet', async function () {
        beforeEach(async function () {
          await token.transfer(faucet.address, 10, { from: accounts[1] });
        });

        it('should let withdrawing the remaining for that period', async function () {
          const tx = await faucet.withdraw(token.address, MAX_BALANCE - 10, { from: accounts[1] });
          assert.ok(tx.receipt.status, 'Status');
          assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
          assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
          assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
          assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
          assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(4990)), 'value');
        });

        it('should prevnet withdrawing too much for that period', async function () {
          await assertRevert(faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] }), 'FC03');
        });

        describe('and a minute later', function () {
          beforeEach(async function () {
            const status_ = await faucet.withdrawStatus(token.address, accounts[1]);
            await faucet.defineWithdrawStatusLastAtTest(token.address, accounts[1], status_.lastAt - 240);
          });

          it('should let withdrawing all tokens', async function () {
            const tx = await faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] });
            assert.ok(tx.receipt.status, 'Status');
            assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
            assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
            assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
            assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
            assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
          });
        });
      });
    });

    describe('and a non operator first withdraw max balance tokens' +
      ' half a period ago and sent them back since', function () {
      beforeEach(async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] });
        lastAt = await web3.eth.getBlock(tx.receipt.blockNumber).then((block) => block.timestamp);
        lastAt = lastAt - ONE_DAY_PERIOD / 2;
        await faucet.defineWithdrawStatusLastAtTest(token.address, accounts[1], lastAt);
        await token.transfer(faucet.address, MAX_BALANCE, { from: accounts[1] });
      });

      it('should let withdrawing more tokens', async function () {
        const tx = await faucet.withdraw(token.address, MAX_BALANCE / 2, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(2500)), 'value');
      });

      it('should let withdrawTo all tokens for someone else', async function () {
        const tx = await faucet.withdrawTo(token.address, accounts[2], MAX_BALANCE, { from: accounts[1] });
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
        assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
        assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
        assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[2]), 'to');
        assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
      });

      it('should prevnet withdrawing too much for that period', async function () {
        await assertRevert(
          faucet.withdraw(
            token.address, Math.floor(MAX_BALANCE / 2 * 1.10), { from: accounts[1] }),
          'FC03',
        );
      });
    });
  });

  describe('With a maxBalance and a period defined for the ALL_TOKENS rules', function () {
    beforeEach(async function () {
      await faucet.defineWithdrawLimit(ALL_TOKENS, MAX_BALANCE, ONE_DAY_PERIOD);
    });

    it('should let non operator to withdraw some tokens', async function () {
      const tx = await faucet.withdraw(token.address, MAX_BALANCE, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[1]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
    });

    it('should let non operator to withdrawTo some tokens', async function () {
      const tx = await faucet.withdrawTo(token.address, accounts[2], MAX_BALANCE, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 1, 'logs');
      assert.equal(tx.receipt.rawLogs[0].topics[0], TRANSFER_LOG, 'transfer');
      assert.equal(tx.receipt.rawLogs[0].topics[1], formatAddressToTopic(faucet.address), 'from');
      assert.equal(tx.receipt.rawLogs[0].topics[2], formatAddressToTopic(accounts[2]), 'to');
      assert.equal(tx.receipt.rawLogs[0].data, formatValueToData(web3.utils.toHex(5000)), 'value');
    });

    it('should prevent non operator to withdraw more tokens than maxBalance', async function () {
      await assertRevert(faucet.withdraw(token.address, MAX_BALANCE + 1, { from: accounts[1] }), 'FC01');
    });
  });

  describe('With a maxBalance and a period defined for ethers', function () {
    let maxETHAmount;

    beforeEach(async function () {
      await web3.eth.sendTransaction({
        from: accounts[1],
        to: faucet.address,
        value: web3.utils.toWei('10', 'ether'),
      });

      const accountBalance = await web3.eth.getBalance(accounts[1]);
      maxETHAmount = new BN(accountBalance.toString()).add(new BN(web3.utils.toWei('1', 'ether'))).toString();
      await faucet.defineWithdrawLimit(NULL_ADDRESS, maxETHAmount, ONE_DAY_PERIOD);
    });

    it('should have a withdraw limit', async function () {
      const limit = await faucet.withdrawLimit(NULL_ADDRESS);
      assert.equal(limit.maxBalance.toString(), maxETHAmount, 'max balance');
      assert.equal(limit.period.toString(), ONE_DAY_PERIOD, 'period');
    });

    it('should let non operator to withdraw ethers tokens', async function () {
      const tx = await faucet.withdraw(NULL_ADDRESS, web3.utils.toWei('1', 'ether'), { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 0, 'logs');
    });

    it('should let non operator to withdrawTo ethers tokens', async function () {
      const tx = await faucet.withdrawTo(
        NULL_ADDRESS, accounts[1], web3.utils.toWei('1', 'ether'), { from: accounts[2] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.receipt.rawLogs.length, 0, 'logs');
    });

    it('should prevent non operator to withdraw more ethers than maxBalance', async function () {
      await assertRevert(faucet.withdraw(NULL_ADDRESS, web3.utils.toWei('2', 'ether'), { from: accounts[1] }), 'FC02');
    });
  });
});
