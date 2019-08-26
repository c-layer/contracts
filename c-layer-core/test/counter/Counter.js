"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const CounterProxy = artifacts.require("CounterProxy.sol");
const CounterCore = artifacts.require("CounterCore.sol");
const CounterDelegate = artifacts.require("CounterDelegate.sol");

contract("Counter", function (accounts) {
  let proxy, core, delegatee;

  beforeEach(async function () {
    core = await CounterCore.new();
    proxy = await CounterProxy.new(core.address);
    delegate = await CounterDelegate.new();

    await core.defineProxyDelegate(proxy.address, delegate.address);
  });

  it("should have a core for proxy", async function () {
    const coreAddress = await proxy.core();
    assert.equal(coreAddress, core.address, "core");
  });

  it("should have a self for the delegate", async function () {
    const delegateAddress = await delegate.self();
    assert.equal(delegateAddress, delegate.address, "core");
  });

  it("should have a count for proxy", async function () {
    const count = await proxy.count(accounts[0]);
    assert.equal(count, 110786, "count");
  });

  it("should have a globalCount for proxy", async function () {
    const globalCount = await proxy.globalCount();
    assert.equal(globalCount, 106280, "globalCount");
  });

  it("should let increase counter", async function () {
    const tx = await proxy.increaseCount(42);
    assert.ok(tx.receipt.status, "Status");
  });

  it("should estimate gas for increase counter", async function () {
    const gas = await proxy.increaseCount.estimateGas(42);
    assert.equal(gas, 0, "gas");
  });

  it("should estimate gas for increase counter with no delegate", async function () {
    const gas = await proxy.increaseCountNoDelegate.estimateGas(42);
    assert.equal(gas, 0, "gas");
  });

  describe("with a counter increased", function () {
    beforeEach(async function () {
      await proxy.increaseCount(42, { from: accounts[0] });
      await proxy.increaseCount(42, { from: accounts[1] });
    });

    it("should have a count for proxy", async function () {
      const count = await proxy.count(accounts[0]);
      assert.equal(count.toString(), 42, "count");
    });

    it("should have a globalCount for proxy", async function () {
      const globalCount = await proxy.globalCount();
      assert.equal(globalCount.toString(), 84, "globalCount");
    });

    it("should have a count for proxy in the core", async function () {
      const count = await core.countCore(proxy.address, accounts[0]);
      assert.equal(count.toString(), 42, "count");
    });

    it("should have a globalCount for proxy", async function () {
      const globalCount = await core.globalCountCore(proxy.address);
      assert.equal(globalCount.toString(), 84, "globalCount");
    });
 
    it("should have a count for core in the core", async function () {
      const count = await core.countCore(core.address, accounts[0]);
      assert.equal(count.toString(), 42, "count");
    });

    it("should have a globalCount for core in the core", async function () {
      const globalCount = await core.globalCountCore(core.address);
      assert.equal(globalCount.toString(), 84, "globalCount");
    });
  });

  describe("with two proxy increased", function () {
    let proxy2;

    beforeEach(async function () {
      proxy2 = await CounterProxy.new(core.address);
      await core.defineProxyDelegate(proxy2.address, delegate.address);

      await proxy.increaseCount(42, { from: accounts[0] });
      await proxy2.increaseCount(42, { from: accounts[0] });
      await proxy.increaseCount(42, { from: accounts[1] });
      await proxy2.increaseCount(42, { from: accounts[1] });
    });

    it("should have a count for proxy", async function () {
      const count = await proxy.count(accounts[0]);
      assert.equal(count, 42, "count");
    });

    it("should have a count for proxy2", async function () {
      const count = await proxy2.count(accounts[1]);
      assert.equal(count, 42, "count");
    });

    it("should have a count for proxy", async function () {
      const count = await proxy.globalCount();
      assert.equal(count, 84, "count");
    });

    it("should have a count for proxy2", async function () {
      const count = await proxy2.globalCount();
      assert.equal(count, 84, "count");
    });

    it("should have a count for core in the core", async function () {
      const count = await core.countCore(core.address, accounts[0]);
      assert.equal(count, 84, "count");
    });

    it("should have a globalCount for the core", async function () {
      const globalCount = await core.globalCountCore(core.address);
      assert.equal(globalCount, 168, "globalCount");
    });
  });
});
