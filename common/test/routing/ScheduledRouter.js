'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const ScheduledRouter = artifacts.require('ScheduledRouter.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');
const DEFAULT_ABI = '0x12345678';
const T_MINUS_1 = Math.floor(new Date().getTime() / 1000 - 24 * 3600);
const T_PLUS_1 = Math.floor(new Date().getTime() / 1000 + 24 * 3600);

contract('ScheduledRouter', function (accounts) {
  let router;

  beforeEach(async function () {
    router = await ScheduledRouter.new();
  });

  it('should have no schedule for self', async function () {
    const schedule = await router.schedule(router.address);
    assert.equal(schedule.startAt.toString(), '0', 'startAt');
    assert.equal(schedule.endAt.toString(), '0', 'endAt');
  });

  it('should have null address for self destination', async function () {
    const destination = await router.findDestination(router.address);
    assert.equal(destination, NULL_ADDRESS, 'destination');
  });

  it('should let owner to set route', async function () {
    const tx = await router.setRoute(accounts[0], [accounts[1], accounts[2]], DEFAULT_ABI);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'RouteDefined', 'event');
    assert.equal(tx.logs[0].args.origin, accounts[0], 'origin');
    assert.deepEqual(tx.logs[0].args.destinations, [accounts[1], accounts[2]], 'destination');
    assert.equal(tx.logs[0].args.destinationAbi, DEFAULT_ABI, 'destinationAbi');
  });

  it('should prevent non owner to set route', async function () {
    await assertRevert(router.setRoute(accounts[0],
      [accounts[1], accounts[2]], DEFAULT_ABI, { from: accounts[1] }), 'OW01');
  });

  describe('With a route defined', function () {
    beforeEach(async function () {
      await router.setRoute(router.address, [accounts[1], accounts[2]], DEFAULT_ABI);
    });

    it('should let owner schedule routes', async function () {
      const tx = await router.setRouteSchedule(router.address, T_MINUS_1, T_PLUS_1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Scheduled', 'event');
      assert.equal(tx.logs[0].args.origin, router.address, 'origin');
      assert.equal(tx.logs[0].args.startAt.toString(), T_MINUS_1.toString(), 'startAt');
      assert.equal(tx.logs[0].args.endAt.toString(), T_PLUS_1.toString(), 'endAt');
    });

    it('should prevent non owner to schedule route', async function () {
      await assertRevert(router.setRouteSchedule(router.address,
        T_MINUS_1, T_PLUS_1, { from: accounts[1] }), 'OW01');
    });

    it('should prevent owner to schedule invalide date', async function () {
      await assertRevert(router.setRouteSchedule(router.address,
        T_PLUS_1, T_MINUS_1), 'SR01');
    });

    describe('With a route scheduled', function () {
      beforeEach(async function () {
        await router.setRouteSchedule(router.address, T_MINUS_1, T_PLUS_1);
      });

      it('should have no schedule for self', async function () {
        const schedule = await router.schedule(router.address);
        assert.equal(schedule.startAt.toString(), T_MINUS_1.toString(), 'startAt');
        assert.equal(schedule.endAt.toString(), T_PLUS_1.toString(), 'endAt');
      });

      it('should have valid address for self destination', async function () {
        const destination = await router.findDestination(router.address);
        assert.equal(destination, accounts[1], 'destination');
      });

      describe('With config locked', function () {
        beforeEach(async function () {
          await router.lockConfig();
        });

        it('should have config locked', async function () {
          const isLocked = await router.isConfigLocked();
          assert.ok(isLocked, 'locked');
        });
      });
    });
  });
});
