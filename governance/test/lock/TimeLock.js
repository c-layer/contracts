'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * @author Guillaume Goutaudier - <ggoutaudier@swissledger.io>
 */

const assertRevert = require('../helpers/assertRevert');
const TimeLockMock = artifacts.require('mock/TimeLockMock.sol');
const TimeLock = artifacts.require('lock/TimeLock.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');
const UNLOCK_TIME_IN_FUTURE = Math.floor(new Date().getTime() / 1000) + 3600;
const UNLOCK_TIME_IN_PAST = Math.floor(new Date().getTime() / 1000) - 3600;
const NULL_ADDRESS = '0x'.padEnd(42, '0');

contract('TimeLock', function (accounts) {
  let timelock, target, token;

  beforeEach(async function () {
    // We will use a Token as target of the TimeLock
    token = await Token.new('Name', 'Symbol', 0, accounts[0], 100);
  });

  it('should not allow creation of TimeLock without a target', async function () {
    await assertRevert(TimeLock.new(NULL_ADDRESS, UNLOCK_TIME_IN_FUTURE), 'TL02');
  });

  it('should not allow creation of TimeLock in the past', async function () {
    await assertRevert(TimeLock.new(token.address, UNLOCK_TIME_IN_PAST), 'TL03');
  });

  describe('after successful TimeLock contract creation', function () {
    beforeEach(async function () {
      timelock = await TimeLockMock.new(token.address, UNLOCK_TIME_IN_FUTURE);
      target = await Token.at(timelock.address);
      await token.transfer(timelock.address, 100);
    });

    it('should have a lockedUntil', async function () {
      const lockedUntil = await timelock.lockedUntil();
      assert.equal(lockedUntil.toString(), UNLOCK_TIME_IN_FUTURE, 'lockedUntil');
    });

    it('should have a target', async function () {
      const targetValue = await timelock.target();
      assert.equal(targetValue, token.address, 'target');
    });

    it('should not allow any fallback() to the target before timelock expiration', async function () {
      await assertRevert(target.transfer(accounts[1], 10), 'TL01');
    });

    describe('after timelock expiration', function () {
      beforeEach(async function () {
        await timelock.setLockedUntilTest(UNLOCK_TIME_IN_PAST);
      });

      it('should fail if target call is not successful', async function () {
        await assertRevert(target.transfer(accounts[1], 1000), 'TL04');
      });

      it('should fail if target call is not successful (with ETH being received)', async function () {
        await assertRevert(web3.eth.sendTransaction({ from: accounts[0], to: timelock.address, value: 1 }), 'TL04');
      });

      it('should execute correctly if target call is successful', async function () {
        await target.transfer(accounts[1], 10);
      });
    });
  });
});
