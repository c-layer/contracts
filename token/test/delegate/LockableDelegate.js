'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const LockableDelegateMock = artifacts.require('LockableDelegateMock.sol');

const TOKEN_ADDRESS = '0x' + '123456789'.padStart(40, '0');
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);

contract('LockableDelegate', function (accounts) {
  let delegate;

  beforeEach(async function () {
    delegate = await LockableDelegateMock.new();
  });

  it('should have transfer unlocked', async function () {
    const result = await delegate.testIsLocked(TOKEN_ADDRESS,
      accounts[0], accounts[1], accounts[2], '1000');
    assert.ok(!result, 'not locked');
  });

  it('should let define the token lock', async function () {
    const tx = await delegate.defineTokenLock(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'TokenLocksDefined', 'event');
    assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
    assert.deepEqual(tx.logs[0].args.locks, [TOKEN_ADDRESS], 'locks');
  });

  it('should let define a lock', async function () {
    const tx = await delegate.defineLock(TOKEN_ADDRESS, PREVIOUS_YEAR, NEXT_YEAR, [accounts[0]]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'LockDefined', 'event');
    assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
    assert.equal(tx.logs[0].args.startAt, PREVIOUS_YEAR, 'startAt');
    assert.equal(tx.logs[0].args.endAt, NEXT_YEAR, 'endAt');
    assert.deepEqual(tx.logs[0].args.exceptions, [accounts[0]], 'exceptions');
  });

  describe('With a lock defined in the past', function () {
    beforeEach(async function () {
      await delegate.defineTokenLock(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, PREVIOUS_YEAR - 1, PREVIOUS_YEAR, []);
    });

    it('should have token unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'not locked');
    });

    it('should let define a new lock', async function () {
      const tx = await delegate.defineLock(TOKEN_ADDRESS, NEXT_YEAR, NEXT_YEAR + 1, [accounts[3]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
      assert.equal(tx.logs[0].args.startAt, NEXT_YEAR, 'startAt');
      assert.equal(tx.logs[0].args.endAt, NEXT_YEAR + 1, 'endAt');
      assert.deepEqual(tx.logs[0].args.exceptions, [accounts[3]], 'exceptions');
    });
  });

  describe('With a lock defined and active now, excepts for accounts 2', function () {
    beforeEach(async function () {
      await delegate.defineTokenLock(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, PREVIOUS_YEAR, NEXT_YEAR, [accounts[3]]);
    });

    it('should have transfer locked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(result, 'frozen');
    });

    it('should have transfer unlocked with caller the exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[3], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'unfrozen');
    });

    it('should have transfer unlocked with sender exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[3], accounts[2], '1000');
      assert.ok(!result, 'unfrozen');
    });

    it('should have transfer unlocked with receiver the exception', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[3], '1000');
      assert.ok(!result, 'unfrozen');
    });

    it('should let remove the lock', async function () {
      const tx = await delegate.defineLock(TOKEN_ADDRESS, 0, 0, []);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
      assert.equal(tx.logs[0].args.startAt, 0, 'startAt');
      assert.equal(tx.logs[0].args.endAt, 0, 'endAt');
      assert.deepEqual(tx.logs[0].args.exceptions, [], 'exceptions');
    });
  });

  describe('With a lock defined active now but not configured', function () {
    beforeEach(async function () {
      await delegate.defineLock(TOKEN_ADDRESS, PREVIOUS_YEAR, NEXT_YEAR, [accounts[3]]);
    });

    it('should have transfer unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'unlocked');
    });
  });

  describe('With a lock defined in the future', function () {
    beforeEach(async function () {
      await delegate.defineTokenLock(TOKEN_ADDRESS, [TOKEN_ADDRESS]);
      await delegate.defineLock(TOKEN_ADDRESS, NEXT_YEAR, NEXT_YEAR + 1, [accounts[3]]);
    });

    it('should have transfer unlocked', async function () {
      const result = await delegate.testIsLocked(TOKEN_ADDRESS,
        accounts[0], accounts[1], accounts[2], '1000');
      assert.ok(!result, 'not frozen');
    });

    it('should let remove the lock', async function () {
      const tx = await delegate.defineLock(TOKEN_ADDRESS, 0, 0, []);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LockDefined', 'event');
      assert.equal(tx.logs[0].args.token, TOKEN_ADDRESS, 'token');
      assert.equal(tx.logs[0].args.startAt, 0, 'startAt');
      assert.equal(tx.logs[0].args.endAt, 0, 'endAt');
      assert.deepEqual(tx.logs[0].args.exceptions, [], 'exceptions');
    });
  });
});
