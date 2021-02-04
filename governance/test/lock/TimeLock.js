'user strict';

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * @author Guillaume Goutaudier - <ggoutaudier@swissledger.io>
 */

const assertRevert = require('../helpers/assertRevert');
const TimeLockMock = artifacts.require('mock/TimeLockMock.sol');
const TimeLock = artifacts.require('lock/TimeLock.sol');
const Token = artifacts.require('mock/TokenERC20Mock.sol');
const unlock_time_in_future = Math.floor(new Date().getTime()/1000) + 3600;
const unlock_time_in_past = Math.floor(new Date().getTime()/1000) - 3600;
const NULL_ADDRESS = '0x'.padEnd(42, '0');


contract('TimeLock', function (accounts) {
  let target, token;

  beforeEach(async function () {
    // We will use a Token as target of the TimeLock
    token = await Token.new('Name', 'Symbol', 0, accounts[0], 100);
  });

  it('should not allow creation of TimeLock without a target', async function () {
    await assertRevert(TimeLock.new(NULL_ADDRESS, unlock_time_in_future), 'TL02');
  });

  it('should not allow creation of TimeLock in the past', async function () {
    await assertRevert(TimeLock.new(token.address, unlock_time_in_past), 'TL03');
  });

  describe('after successful TimeLock contract creation', function () {
    beforeEach(async function () {
      timelock = await TimeLockMock.new(token.address, unlock_time_in_future);
      timelock_target = await Token.at(timelock.address);
      await token.transfer(timelock.address, 100);
    });

    it('should not allow any fallback() to the target before timelock expiration', async function () {
      await assertRevert(timelock_target.transfer(accounts[1], 10), 'TL01');
    });

    describe('after timelock expiration', function() {
      beforeEach(async function () {
        await timelock.setLockedUntilTest(unlock_time_in_past);
      });

      it('should fail if target call is not successful', async function () {
        await assertRevert(timelock_target.transfer(accounts[1], 1000), 'TL04');
      });

      it('should fail if target call is not successful (with ETH being received)', async function () {
        await assertRevert(web3.eth.sendTransaction({from:accounts[0], to:timelock.address, value:1}), 'TL04');
      });

      it('should execute correctly if target call is successful', async function () {
	await timelock_target.transfer(accounts[1], 10);
      });
    });
  });
});

