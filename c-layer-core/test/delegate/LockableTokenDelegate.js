"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const LockableTokenDelegate = artifacts.require("LockableTokenDelegate.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

const BEFORE = 1500000000;
const AFTER = 5000000000;

contract("LockableToken", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await LockableTokenDelegate.new();
    core = await TokenCore.new("Test");
    await core.defineTokenDelegate(1, delegate.address, []);

    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);
  });

  it("should have audit requirements", async function () {
    const auditRequirements = await delegate.auditRequirements();
    assert.equal(auditRequirements.toString(), 0, "audit requirements");
  });

  it("should transfer from accounts[0] to accounts[1]", async function () {
    const tx = await token.transfer(accounts[1], "3333");
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Transfer", "event");
    assert.equal(tx.logs[0].args.from, accounts[0], "from");
    assert.equal(tx.logs[0].args.to, accounts[1], "to");
    assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

    const balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0.toString(), "996667", "balance");
    const balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1.toString(), "3333", "balance");
  });

  it("should let define a lock", async function () {
    const tx = await core.defineLock(token.address, BEFORE, AFTER, [accounts[0]]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "LockDefined", "event");
    assert.equal(tx.logs[0].args.token, token.address, "token");
    assert.equal(tx.logs[0].args.startAt, BEFORE, "startAt");
    assert.equal(tx.logs[0].args.endAt, AFTER, "endAt");
    assert.deepEqual(tx.logs[0].args.exceptions, [accounts[0]], "exceptions");
  });

  describe("With a lock defined in the past", function () {
    beforeEach(async function () {
      await core.defineLock(token.address, BEFORE - 1, BEFORE, []);
    });

    it("Should have a lock", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[4].map((x) => x.toNumber()), [BEFORE - 1, BEFORE], "lock start/end");
    });

    it("should have canTransfer returns Ok", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 1, "canTransfer");
    });

    it("should allow transfer from accounts[0] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });
  });

  describe("With a lock defined and active now, excepts for accounts 2", function () {
    beforeEach(async function () {
      await token.transfer(accounts[2], "3333");
      core.defineLock(token.address, BEFORE, AFTER, [accounts[2]]);
    });

    it("Should have a lock", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[4].map((x) => x.toNumber()), [BEFORE, AFTER], "lock start/end");
    });

    it("should have canTransfer returns Locked", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 5, "canTransfer");
    });

    it("should prevent transfer from accounts[0] to accounts[1]", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO03");
    });

    it("should allow transfer from accounts[2] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "3333", { from: accounts[2] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[2], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });
  });

  describe("With a lock defined in the future", function () {
    beforeEach(async function () {
      core.defineLock(token.address, AFTER, AFTER + 1, [accounts[2]]);
    });

    it("Should have a lock", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[4].map((x) => x.toNumber()), [AFTER, AFTER + 1], "lock start/end");
    });

    it("should have canTransfer returns Ok", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 1, "canTransfer");
    });

    it("should allow transfer from accounts[0] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });
  });
});
