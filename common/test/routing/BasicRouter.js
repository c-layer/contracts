'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const BasicRouter = artifacts.require('BasicRouter.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');
const NULL_ABI = '0x'.padEnd(10, '0');
const DEFAULT_ABI = '0x12345678';

contract('BasicRouter', function (accounts) {
  let router;

  beforeEach(async function () {
    router = await BasicRouter.new();
  });

  it('should have no destination', async function () {
    const destinations = await router.destinations(router.address);
    assert.deepEqual(destinations, [], 'destinations');
  });

  it('should have active destination for self', async function () {
    const active = await router.activeDestination(router.address);
    assert.equal(active.toString(), '0', 'active');
  });

  it('should have null abi for self destination', async function () {
    const destinationAbi = await router.destinationAbi(router.address);
    assert.equal(destinationAbi, NULL_ABI, 'abi');
  });

  it('should not have config locked', async function () {
    const isLocked = await router.isConfigLocked();
    assert.ok(!isLocked, 'locked');
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

    it('should have destinations', async function () {
      const destinations = await router.destinations(router.address);
      assert.deepEqual(destinations, [accounts[1], accounts[2]], 'destinations');
    });

    it('should have active destination for self', async function () {
      const active = await router.activeDestination(router.address);
      assert.equal(active.toString(), '0', 'active');
    });

    it('should have abi for self destination', async function () {
      const destinationAbi = await router.destinationAbi(router.address);
      assert.equal(destinationAbi, DEFAULT_ABI, 'abi');
    });

    it('should not have config locked', async function () {
      const isLocked = await router.isConfigLocked();
      assert.ok(!isLocked, 'locked');
    });

    it('should have an active destination', async function () {
      const destination = await router.findDestination(router.address);
      assert.equal(destination, accounts[1], 'destination');
    });

    it('should let owner lock the config', async function () {
      const tx = await router.lockConfig();
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ConfigLocked', 'event');
    });

    it('should prevent non owner to lock config', async function () {
      await assertRevert(router.lockConfig({ from: accounts[1] }), 'OW01');
    });

    it('should let owner switch destination', async function () {
      const tx = await router.switchDestination(router.address, 1);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'DestinationSwitched', 'event');
      assert.equal(tx.logs[0].args.origin, router.address, 'origin');
      assert.equal(tx.logs[0].args.activeDestination, 1, 'active');
    });

    it('should prevent owner to switch to an invalid destination', async function () {
      await assertRevert(router.switchDestination(router.address, 2), 'RO03');
    });

    it('should prevent non owner to switch destination', async function () {
      await assertRevert(router.switchDestination(router.address, 1, { from: accounts[1] }), 'OW01');
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
