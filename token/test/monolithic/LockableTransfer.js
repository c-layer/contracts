'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const BN = require('bn.js');
const assertRevert = require('../helpers/assertRevert');
const LockableTransfer = artifacts.require('LockableTransfer.sol');

const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const END_OF_TIME = new BN(2).pow(new BN(64)).sub(new BN(1));
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);
const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

contract('LockableTransfer', function (accounts) {
  let lockable;

  beforeEach(async function () {
    lockable = await LockableTransfer.new();
  });

  it('should have transfer not locked', async function () {
    const result = await lockable.isTransferLocked(accounts[0], accounts[1]);
    assert.ok(!result, 'not locked');
  });

  it('should prevent non operator to define a lock', async function () {
    await assertRevert(lockable.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR,
      { from: accounts[1] }), 'OP01');
  });

  it('should let define a lock', async function () {
    const tx = await lockable.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'LockDefined', 'event');
    assert.equal(tx.logs[0].args.sender, ANY_ADDRESSES, 'sender');
    assert.equal(tx.logs[0].args.receiver, ANY_ADDRESSES, 'receiver');
    assert.equal(tx.logs[0].args.startAt, PREVIOUS_YEAR, 'startAt');
    assert.equal(tx.logs[0].args.endAt, NEXT_YEAR, 'endAt');
  });

  it('should prevent defining a lock with an inverted time interval', async function () {
    await assertRevert(lockable.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, NEXT_YEAR, PREVIOUS_YEAR), 'LT01');
  });

  describe('With everyone prevented to send to account 1', async function () {
    beforeEach(async function () {
      await lockable.defineLock(ANY_ADDRESSES, accounts[1], PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should have transfer not locked to account 2', async function () {
      const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer locked to account 1', async function () {
      const result = await lockable.isTransferLocked(accounts[0], accounts[1]);
      assert.ok(result, 'locked');
    });
  });

  describe('With everyone prevented to receive from account 1', async function () {
    beforeEach(async function () {
      await lockable.defineLock(accounts[1], ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should have transfer not locked from account 2', async function () {
      const result = await lockable.isTransferLocked(accounts[2], accounts[0]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer locked from account 1', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
      assert.ok(result, 'locked');
    });
  });

  describe('With account 1 prevented to send to account 2', async function () {
    beforeEach(async function () {
      await lockable.defineLock(accounts[1], accounts[2], PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should have transfer not locked to account 2 from account 0', async function () {
      const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer not locked from account 1 to account 0', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer locked from account 1 to account 2', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
      assert.ok(result, 'locked');
    });
  });

  describe('With everyone prevented to send to account 1, except account 2', async function () {
    beforeEach(async function () {
      await lockable.defineLock(ANY_ADDRESSES, accounts[1], PREVIOUS_YEAR, NEXT_YEAR);
      await lockable.defineLock(accounts[2], accounts[1], NEXT_YEAR, NEXT_YEAR);
    });

    it('should have transfer locked to account 1 from account 0', async function () {
      const result = await lockable.isTransferLocked(accounts[0], accounts[1]);
      assert.ok(result, 'locked');
    });

    it('should have transfer not locked to account 2 from account 0', async function () {
      const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer not locked from account 1 to account 0', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer not locked from account 1 to account 2', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
      assert.ok(!result, 'not locked');
    });

    it('should have transfer not locked from account 2 to account 1', async function () {
      const result = await lockable.isTransferLocked(accounts[2], accounts[1]);
      assert.ok(!result, 'not locked');
    });
  });

  describe('With a token lock defined in the present', function () {
    beforeEach(async function () {
      await lockable.defineLock(
        ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should have a lock', async function () {
      const lock = await lockable.lock(ANY_ADDRESSES, ANY_ADDRESSES);
      assert.equal(lock.startAt, PREVIOUS_YEAR, 'startAt');
      assert.equal(lock.endAt, NEXT_YEAR, 'endAt');
    });

    it('should have token locked', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
      assert.ok(result, 'locked');
    });

    describe('With everyone allowed to send to account 1', async function () {
      beforeEach(async function () {
        await lockable.defineLock(ANY_ADDRESSES, accounts[1], NEXT_YEAR, NEXT_YEAR);
      });

      it('should have transfer locked to account 2', async function () {
        const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
        assert.ok(result, 'locked');
      });

      it('should have transfer not locked to account 1', async function () {
        const result = await lockable.isTransferLocked(accounts[0], accounts[1]);
        assert.ok(!result, 'not locked');
      });
    });

    describe('With everyone allowed to receive from account 1', async function () {
      beforeEach(async function () {
        await lockable.defineLock(accounts[1], ANY_ADDRESSES, NEXT_YEAR, NEXT_YEAR);
      });

      it('should have transfer locked from account 2', async function () {
        const result = await lockable.isTransferLocked(accounts[2], accounts[0]);
        assert.ok(result, 'locked');
      });

      it('should have transfer not locked from account 1', async function () {
        const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
        assert.ok(!result, 'not locked');
      });
    });

    describe('With account 1 allowed to send to account 2', async function () {
      beforeEach(async function () {
        await lockable.defineLock(accounts[1], accounts[2], NEXT_YEAR, NEXT_YEAR);
      });

      it('should have transfer locked to account 2 from account 0', async function () {
        const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
        assert.ok(result, 'locked');
      });

      it('should have transfer locked from account 1 to account 0', async function () {
        const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
        assert.ok(result, 'locked');
      });

      it('should have transfer not locked from account 1 to account 2', async function () {
        const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
        assert.ok(!result, 'not locked');
      });
    });

    describe('With everyone allowed to send to account 1, except from account 2', async function () {
      beforeEach(async function () {
        await lockable.defineLock(ANY_ADDRESSES, accounts[1], NEXT_YEAR, NEXT_YEAR);
        await lockable.defineLock(accounts[2], accounts[1], PREVIOUS_YEAR, NEXT_YEAR);
      });

      it('should have transfer not locked to account 1 from account 0', async function () {
        const result = await lockable.isTransferLocked(accounts[0], accounts[1]);
        assert.ok(!result, 'not locked');
      });

      it('should have transfer locked to account 2 from account 0', async function () {
        const result = await lockable.isTransferLocked(accounts[0], accounts[2]);
        assert.ok(result, 'locked');
      });

      it('should have transfer locked from account 1 to account 0', async function () {
        const result = await lockable.isTransferLocked(accounts[1], accounts[0]);
        assert.ok(result, 'locked');
      });

      it('should have transfer locked from account 1 to account 2', async function () {
        const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
        assert.ok(result, 'locked');
      });

      it('should have transfer locked from account 2 to account 1', async function () {
        const result = await lockable.isTransferLocked(accounts[2], accounts[1]);
        assert.ok(result, 'locked');
      });
    });
  });

  describe('With a token lock defined in the future', function () {
    beforeEach(async function () {
      await lockable.defineLock(
        ANY_ADDRESSES, ANY_ADDRESSES, NEXT_YEAR, END_OF_TIME);
    });

    it('should have a lock', async function () {
      const lock = await lockable.lock(ANY_ADDRESSES, ANY_ADDRESSES);
      assert.equal(lock.startAt, NEXT_YEAR, 'startAt');
      assert.equal(lock.endAt.toString(), END_OF_TIME.toString(), 'endAt');
    });

    it('should have token not locked', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
      assert.ok(!result, 'not locked');
    });
  });

  describe('With a token lock defined in the past', function () {
    beforeEach(async function () {
      await lockable.defineLock(
        ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR - 1, PREVIOUS_YEAR);
    });

    it('should have a lock', async function () {
      const lock = await lockable.lock(ANY_ADDRESSES, ANY_ADDRESSES);
      assert.equal(lock.startAt, PREVIOUS_YEAR - 1, 'startAt');
      assert.equal(lock.endAt, PREVIOUS_YEAR, 'endAt');
    });

    it('should have token not locked', async function () {
      const result = await lockable.isTransferLocked(accounts[1], accounts[2]);
      assert.ok(!result, 'not locked');
    });

    it('should let define a new lock', async function () {
      const tx = await lockable.defineLock(ANY_ADDRESSES, ANY_ADDRESSES, NEXT_YEAR, NEXT_YEAR + 1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.sender, ANY_ADDRESSES, 'sender');
      assert.equal(tx.logs[0].args.receiver, ANY_ADDRESSES, 'receiver');
      assert.equal(tx.logs[0].args.startAt, NEXT_YEAR, 'startAt');
      assert.equal(tx.logs[0].args.endAt, NEXT_YEAR + 1, 'endAt');
    });
  });
});
