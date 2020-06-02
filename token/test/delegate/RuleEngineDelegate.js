"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const RuleEngineDelegate = artifacts.require("RuleEngineDelegate.sol");
const YesNoRule = artifacts.require("YesNoRule.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

contract("RuleEngineDelegate", function (accounts) {
  let core, delegate, token, yesRule, noRule;

  beforeEach(async function () {
    delegate = await RuleEngineTokenDelegate.new();
    core = await TokenCoreMock.new("Test", [accounts[0]]);
    await core.defineTokenDelegate(1, delegate.address, []);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);
    await token.approve(accounts[1], AMOUNT);
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

  it("should let define rules", async function () {
    yesRule = await YesNoRule.new(true);
    noRule = await YesNoRule.new(false);
    const tx = await core.defineRules(token.address, [yesRule.address, noRule.address]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "RulesDefined", "event");
    assert.equal(tx.logs[0].args.token, token.address, "token");
    assert.deepEqual(tx.logs[0].args.rules, [yesRule.address, noRule.address], "rules");
  });

  describe("With a yes rule defined", function () {
    beforeEach(async function () {
      yesRule = await YesNoRule.new(true);
      await core.defineRules(token.address, [yesRule.address]);
    });

    it("should have a rule", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[6], [yesRule.address], "rules");
    });

    it("should have canTransfer returns Ok", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 1, "canTransfer");
    });

    it("should transfer from accounts[0] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });

    it("should transferFrom from accounts[0] to accounts[1]", async function () {
      const tx = await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[2], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
    });
  });

  describe("With a no rule defined", function () {
    beforeEach(async function () {
      noRule = await YesNoRule.new(false);
      await core.defineRules(token.address, [noRule.address]);
    });

    it("should have a no rule", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[6], [noRule.address], "rules");
    });

    it("should have canTransfer returns Rule", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 7, "canTransfer");
    });

    it("should transferFrom from accounts[0] to accounts[1]", async function () {
      await assertRevert(token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] }), "CO03");
    });

    it("should transfer from accounts[0] to accounts[1]", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO03");
    });
  });

  describe("With a yes and a no rule defined", function () {
    beforeEach(async function () {
      yesRule = await YesNoRule.new(true);
      noRule = await YesNoRule.new(false);
      await core.defineRules(token.address, [yesRule.address, noRule.address]);
    });

    it("should have 2 rules", async function () {
      const tokenData = await core.token(token.address);
      assert.deepEqual(tokenData[6], [yesRule.address, noRule.address], "rules");
    });

    it("should have canTransfer returns Rule", async function () {
      const result = await token.canTransfer.call(accounts[0], accounts[1], "3333");
      assert.equal(result, 7, "canTransfer");
    });

    it("should transfer from accounts[0] to accounts[1]", async function () {
      await assertRevert(token.transfer(accounts[1], "3333"), "CO03");
    });

    it("should transferFrom from accounts[0] to accounts[1]", async function () {
      await assertRevert(token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] }), "CO03");
    });
  });
});
