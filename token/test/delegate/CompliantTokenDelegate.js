"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const CompliantTokenDelegate = artifacts.require("CompliantTokenDelegate.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const BEFORE = 1500000000;
const AFTER = 5000000000;

contract("CompliantTokenDelegate", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await CompliantTokenDelegate.new();
    core = await TokenCore.new("Test", [accounts[0]]);
    await core.defineTokenDelegate(1, delegate.address, [1, 2]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.mint(token.address, [accounts[0]], [AMOUNT]);
    await token.approve(accounts[1], AMOUNT);
  });

  it("should have no valid configurations with 0 configurations", async function () {
    const check = await delegate.checkConfigurations([]);
    assert.ok(check, "checked configurations");
  });

  it("should have no valid configurations with 1 configurations", async function () {
    const check = await delegate.checkConfigurations([1]);
    assert.ok(check, "checked configurations");
  });

  it("should have valid configurations with 3 configurations", async function () {
    const check = await delegate.checkConfigurations([1, 2, 3]);
    assert.ok(check, "checked configurations");
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
});
