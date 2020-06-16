"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const FreezableTokenDelegate = artifacts.require("FreezableTokenDelegate.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const BEFORE = 1500000000;
const AFTER = 5000000000;

contract("FreezableTokenDelegate", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await FreezableTokenDelegate.new();
    core = await TokenCore.new("Test", [delegate.address]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);
    await token.approve(accounts[1], AMOUNT);
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

  it("should let freeze many addresses", async function () {
    const tx = await core.freezeManyAddresses(token.address, [accounts[1], accounts[2]], AFTER);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, "Freeze", "event");
    assert.equal(tx.logs[0].args.address_, accounts[1], "address");
    assert.equal(tx.logs[0].args.until, AFTER, "until");
    assert.equal(tx.logs[1].event, "Freeze", "event");
    assert.equal(tx.logs[1].args.address_, accounts[2], "address");
    assert.equal(tx.logs[1].args.until, AFTER, "until");
  });

  describe("With freezed account 1 in the future and account 2 in the past", function () {
    beforeEach(async function () {
      await core.freezeManyAddresses(token.address, [accounts[1]], AFTER);
      await core.freezeManyAddresses(token.address, [accounts[2]], BEFORE);
    });

    it("should have account 1 frozen", async function () {

    });

    it("should have canTransfer frozen for account 0 to account 1", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], 100);
      assert.equal(result, 6, "canTransfer");
    });

    it("should prevent transfer from account 0 to account 1", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO03");
    });

    it("should prevent transferFrom from account 0 to account 1", async function () {
      await assertRevert(token.transferFrom(accounts[1], accounts[1], "3333"), "CO03");
    });
    
    it("should have account 2 not frozen", async function () {

    });

    it("should have canTransfer Ok for account 0 to account 2", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[2], 100);
      assert.equal(result, 1, "canTransfer");
    });

    it("should transfer from account 0 to account 2", async function () {
      const tx = await token.transfer(accounts[2], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[2], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });

    it("should transferFrom from account 0 to account 2", async function () {
      const tx = await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[2], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });
  });
});
