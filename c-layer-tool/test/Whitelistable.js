"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const Whitelist = artifacts.require("../contracts/Whitelist.sol");
const WhitelistableMock = artifacts.require("../contracts/WhitelistableMock.sol");

contract("Whitelistable", function (accounts) {
  let whitelist;
  let whitelistable;

  beforeEach(async function () {
    whitelist = await Whitelist.new([accounts[1], accounts[2]]);
    whitelistable = await WhitelistableMock.new();
  });

  it("should have no whitelist", async function () {
    const whitelistAddr = await whitelistable.whitelist();
    assert.equal(whitelistAddr, "0x0000000000000000000000000000000000000000");
  });

  it("should have a modifier blocking", async function () {
    await assertRevert(whitelistable.testMe());
  });

  it("should update the whitelist", async function () {
    const tx = await whitelistable.updateWhitelist(whitelist.address);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "WhitelistUpdated");
    assert.equal(tx.logs[0].args.whitelist, whitelist.address);
  });

  describe("with a whitelist configured", function () {
    beforeEach(async function () {
      await whitelistable.updateWhitelist(whitelist.address);
    });

    it("should returns the whitelist address", async function () {
      const whitelistAddr = await whitelistable.whitelist();
      assert.equal(whitelistAddr, whitelist.address, "whitelistAddr");
    });

    it("should have the modifier working", async function () {
      const txApprove = await whitelist.approveAddress(accounts[0]);
      assert.ok(txApprove.receipt.status, "Status");
      const txIsWhitelisted = await whitelistable.testMe();
      assert.ok(txIsWhitelisted.receipt.status, "Status");

      const success = await whitelistable.success();
      assert.equal(success, true, "modifier success");
    });
  });
});
