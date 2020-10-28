'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const LockableDelegateMock = artifacts.require('LockableDelegateMock.sol');

const TOKEN_ADDRESS = '0x' + '123456789'.padStart(40, '0');
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const END_OF_TIME = '0x'.padEnd(18, '1');
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);
const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

contract('LockableDelegate', function (accounts) {
  let delegate;

  beforeEach(async function () {
    delegate = await LockableDelegateMock.new();
    await delegate.defineLockProxies([TOKEN_ADDRESS]);
  });

  it('should have transfer unlocked', async function () {
    const result = await delegate.testIsLocked(TOKEN_ADDRESS,
      accounts[0], accounts[1], accounts[2], '1000');
    assert.ok(!result, 'not locked');
  });

  it('should let define the token lock', async function () {
    const tx = await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'TokenLocksDefined', 'event');
    assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
    assert.deepEqual(tx.logs[0].args.locks, [TOKEN_ADDRESS], 'locks');
  });

  it('should let define a lock', async function () {
    const tx = await delegate.defineLock(
      TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'LockDefined', 'event');
    assert.equal(tx.logs[0].args.lock, TOKEN_ADDRESS, 'lock');
    assert.equal(tx.logs[0].args.startAt, PREVIOUS_YEAR, 'startAt');
    assert.equal(tx.logs[0].args.endAt, NEXT_YEAR, 'endAt');
  });

  describe('With a lock defined in the past', function () {
    beforeEach(async function () {
      await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(
        TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR - 1, PREVIOUS_YEAR);
    });

    it('should have token unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'not locked');
    });

    it('should let define a new lock', async function () {
      const tx = await delegate.defineLock(
        TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, NEXT_YEAR, NEXT_YEAR + 1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.lock, TOKEN_ADDRESS, 'lock');
      assert.equal(tx.logs[0].args.startAt, NEXT_YEAR, 'startAt');
      assert.equal(tx.logs[0].args.endAt, NEXT_YEAR + 1, 'endAt');
    });
  });

  describe('With a lock defined and active now, excepts for accounts 2 receiver', function () {
    beforeEach(async function () {
      await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
      await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, accounts[2], END_OF_TIME, END_OF_TIME);
    });

    it('should have transfer locked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[2], accounts[1], accounts[0], '1000');
      assert.ok(result, 'locked');
    });

    it('should have transfer unlocked with sender the exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[3], accounts[2], accounts[1], '1000');
      assert.ok(result, 'locked');
    });

    it('should have transfer unlocked with receiver the exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[3], accounts[2], '1000');
      assert.ok(!result, 'unlocked');
    });

    it('should have transfer unlocked without the exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[3], '1000');
      assert.ok(result, 'locked');
    });

    it('should let remove the lock', async function () {
      const tx = await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, 0, 0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.lock, TOKEN_ADDRESS, 'lock');
      assert.equal(tx.logs[0].args.startAt, 0, 'startAt');
      assert.equal(tx.logs[0].args.endAt, 0, 'endAt');
    });
  });

  describe('With a lock defined active now but not configured', function () {
    beforeEach(async function () {
      await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, PREVIOUS_YEAR, NEXT_YEAR);
    });

    it('should have transfer unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'unlocked');
    });
  });

  describe('With a lock defined in the future', function () {
    beforeEach(async function () {
      await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, NEXT_YEAR, NEXT_YEAR + 1);
    });

    it('should have transfer unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'not locked');
    });

    it('should let remove the lock', async function () {
      const tx = await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, ANY_ADDRESSES, 0, 0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.lock, TOKEN_ADDRESS, 'lock');
      assert.equal(tx.logs[0].args.startAt, 0, 'startAt');
      assert.equal(tx.logs[0].args.endAt, 0, 'endAt');
    });
  });

  describe('With a lock defined where A => * is unlocked in future and * => B is locked now', function () {
    beforeEach(async function () {
      await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, accounts[1], ANY_ADDRESSES, NEXT_YEAR, NEXT_YEAR + 1);
      await delegate.defineLock(TOKEN_ADDRESS, ANY_ADDRESSES, accounts[2], PREVIOUS_YEAR, NEXT_YEAR + 1);
    });

    it('should have transfer unlocked A => C', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[3], '1000');
      assert.ok(!result, 'unlocked');
    });

    it('should have transfer locked C => B', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[3], accounts[2], '1000');
      assert.ok(result, 'locked');
    });

    it('should have transfer locked A => B', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(result, 'locked');
    });
  });

  describe('With a non token lock defined', function () {
    beforeEach(async function () {
      await delegate.defineLockProxies([TOKEN_ADDRESS, accounts[0]]);
      await delegate.defineTokenLocks(TOKEN_ADDRESS, [TOKEN_ADDRESS, accounts[0]]);
      await delegate.defineLock(accounts[0], ANY_ADDRESSES, ANY_ADDRESSES, 0, NEXT_YEAR);
      await delegate.defineLock(accounts[0], accounts[3], ANY_ADDRESSES, END_OF_TIME, END_OF_TIME);
    });

    it('should have transfer locked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(result, 'locked');
    });

    it('should have transfer unlocked for accounts[3]', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[3], accounts[2], '1000');
      assert.ok(!result, 'not locked');
    });

    it('should let remove the lock', async function () {
      const tx = await delegate.defineLock(accounts[0], ANY_ADDRESSES, ANY_ADDRESSES, 0, 0);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.lock, accounts[0], 'lock');
      assert.equal(tx.logs[0].args.startAt, 0, 'startAt');
      assert.equal(tx.logs[0].args.endAt, 0, 'endAt');
    });
  });
});
