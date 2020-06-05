"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const FreezableDelegateMock = artifacts.require("FreezableDelegateMock.sol");

const TOKEN_ADDRESS = "0x" + "123456789".padStart(40, "0");
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);
const PREVIOUS_YEAR = Math.floor(new Date().getTime() / 1000) - (24 * 3600 * 365);

contract("FreezableDelegate", function (accounts) {
  let delegate;

  beforeEach(async function () {
    delegate = await FreezableDelegateMock.new();
  });

  it("should have transfer unfrozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[0], accounts[1], accounts[2], "1000");
    assert.ok(!result, "not frozen");
  });

  it("should let freeze many addresses", async function () {
    const tx = await delegate.freezeManyAddresses(TOKEN_ADDRESS, [accounts[1], accounts[2]], NEXT_YEAR);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, "Freeze", "event");
    assert.equal(tx.logs[0].args.address_, accounts[1], "address");
    assert.equal(tx.logs[0].args.until, NEXT_YEAR, "until");
    assert.equal(tx.logs[1].event, "Freeze", "event");
    assert.equal(tx.logs[1].args.address_, accounts[2], "address");
    assert.equal(tx.logs[1].args.until, NEXT_YEAR, "until");
  });

  describe("With freezed account 1 in the future and account 2 in the past", function () {
    beforeEach(async function () {
      await delegate.freezeManyAddresses(TOKEN_ADDRESS, [accounts[1]], NEXT_YEAR);
      await delegate.freezeManyAddresses(TOKEN_ADDRESS, [accounts[2]], PREVIOUS_YEAR);
    });

    it("should have account 1 as caller frozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[1], accounts[0], accounts[3], "1000");
    assert.ok(result, "frozen");

    });

    it("should have account 1 as sender frozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[0], accounts[1], accounts[3], "1000");
    assert.ok(result, "frozen");

    });

    it("should have account 1 as receiver frozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[0], accounts[3], accounts[1], "1000");
    assert.ok(result, "frozen");

    });

    it("should have account 2 as caller unfrozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[2], accounts[0], accounts[3], "1000");
    assert.ok(!result, "not frozen");

    });

    it("should have account 2 as sender unfrozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[0], accounts[2], accounts[3], "1000");
    assert.ok(!result, "not frozen");

    });

    it("should have account 2 as receiver unfrozen", async function () {
    const result = await delegate.testIsFrozen(TOKEN_ADDRESS,
      accounts[0], accounts[3], accounts[2], "1000");
    assert.ok(!result, "not frozen");

    });
  });
});
