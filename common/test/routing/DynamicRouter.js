'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const DynamicRouter = artifacts.require('DynamicRouter.sol');

const NULL_ADDRESS = '0x'.padEnd(42, '0');
const DEFAULT_ABI = '0x12345678';

contract('DynamicRouter', function (accounts) {
  let router;

  beforeEach(async function () {
    router = await DynamicRouter.new();
  });

  it('should have null address for self destination', async function () {
    const destination = await router.findDestination(router.address);
    assert.equal(destination, NULL_ADDRESS, 'destination');
  });

  it('should have max balances for self destination', async function () {
    const maxBalances = await router.maxBalances(router.address);
    assert.deepEqual(maxBalances, [], 'max balances');
  });

  it('should have weights for self destination', async function () {
    const weights = await router.weights(router.address);
    assert.deepEqual(weights, [], 'weights');
  });

  it('should let owner to set distribution', async function () {
    const tx = await router.setRoute(accounts[0], [accounts[1], accounts[2]], DEFAULT_ABI);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'RouteDefined', 'event');
    assert.equal(tx.logs[0].args.origin, accounts[0], 'origin');
    assert.deepEqual(tx.logs[0].args.destinations, [accounts[1], accounts[2]], 'destination');
    assert.equal(tx.logs[0].args.destinationAbi, DEFAULT_ABI, 'destinationAbi');

    assert.equal(tx.logs[1].event, 'DistributionDefined', 'event');
    assert.equal(tx.logs[1].args.origin, accounts[0], 'origin');
    assert.deepEqual(tx.logs[1].args.maxBalances.map((x) => x.toString()),
      ['0', '0'], 'maxBalances');
    assert.deepEqual(tx.logs[1].args.weights.map((x) => x.toString()),
      ['0', '0'], 'weights');
   });

  it('should prevent non owner to set route', async function () {
    await assertRevert(router.setRoute(accounts[0],
      [accounts[1], accounts[2]], DEFAULT_ABI, { from: accounts[1] }), 'OW01');
  });

  describe('With a route defined', function () {
    beforeEach(async function () {
      await router.setRoute(router.address, [accounts[1], accounts[2], router.address], DEFAULT_ABI);
      await router.setRoute(accounts[0], [router.address, accounts[2], accounts[3]], DEFAULT_ABI);
      await router.setRoute(accounts[1], [accounts[1], accounts[2], accounts[3]], DEFAULT_ABI);
    });

    it('should let owner set distribution', async function () {
      const tx = await router.setDistribution(
        router.address, [0, 1000, 1000], [1, 1, 2]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'DistributionDefined', 'event');
      assert.equal(tx.logs[0].args.origin, router.address, 'origin');
      assert.deepEqual(tx.logs[0].args.maxBalances.map((x) => x.toString()),
        ['0', '1000', '1000'], 'maxBalances');
      assert.deepEqual(tx.logs[0].args.weights.map((x) => x.toString()),
        ['1', '1', '2'], 'weights');
    });

    it('should prevent non owner to set distribution', async function () {
      await assertRevert(router.setDistribution(
        router.address, [0, 1000, 1000], [1, 1, 2], { from: accounts[1] }), 'OW01');
    });

    it('should prevent owner to set distribution', async function () {
      await assertRevert(router.setDistribution(router.address, [], []), 'DR01');
    });

    describe('With a distribution defined', function () {
      beforeEach(async function () {
        await router.setDistribution(
          router.address, [0, 1000, 1000], [1, 1, 2]);
      });

      it('should have max balances for self destination', async function () {
        const maxBalances = await router.maxBalances(router.address);
        assert.deepEqual(maxBalances.map((x) => x.toString()),
          ['0', '1000', '1000'], 'max balances');
      });

      it('should have weights for self destination', async function () {
        const weights = await router.weights(router.address);
        assert.deepEqual(weights.map((x) => x.toString()),
          ['1', '1', '2'], 'weights');
      });

      it('should have self address for route 1', async function () {
        const destination = await router.findDestination(router.address);
        assert.equal(destination, router.address, 'destination');
      });

      it('should have self address for route 2', async function () {
        const destination = await router.findDestination(accounts[0]);
        assert.equal(destination, router.address, 'destination');
      });

      it('should have null address for route 3', async function () {
        const destination = await router.findDestination(accounts[1]);
        assert.equal(destination, NULL_ADDRESS, 'destination');
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
