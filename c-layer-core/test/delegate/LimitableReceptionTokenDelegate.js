"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const LimitableReceptionTokenDelegate = artifacts.require("LimitableReceptionTokenDelegate.sol");

const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");

contract("LimitableReceptionTokenDelegate", function (accounts) {
  let core, delegate, token, userRegistry, ratesProvider;

  beforeEach(async function () {
    delegate = await LimitableReceptionTokenDelegate.new();
    core = await TokenCore.new("Test", [delegate.address]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);

    userRegistry = await UserRegistryMock.new(
      [accounts[0], accounts[1], accounts[2]], CHF, [5, 3333]);
    ratesProvider = await RatesProviderMock.new();
    await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
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

  it("should allow accounts[1] to receive too many tokens", async function () {
    const tx = await token.transfer(accounts[1], "3334");
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Transfer", "event");
    assert.equal(tx.logs[0].args.from, accounts[0], "from");
    assert.equal(tx.logs[0].args.to, accounts[1], "to");
    assert.equal(tx.logs[0].args.value.toString(), "3334", "value");
  });

  it("should allow accounts[3] to receive some tokens", async function () {
    const tx = await token.transfer(accounts[3], "3333");
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Transfer", "event");
    assert.equal(tx.logs[0].args.from, accounts[0], "from");
    assert.equal(tx.logs[0].args.to, accounts[3], "to");
    assert.equal(tx.logs[0].args.value.toString(), "3333", "value");
  });

  describe("with audit selector", function () {
    beforeEach(async function () {
      await core.defineAuditSelector(core.address, 0, [accounts[0]], [true]);
    });

    it("should transfer from accounts[0] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "2222");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "2222", "value");
    });

    describe("with many transfers", function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], "1000");
        await token.transfer(accounts[1], "1222");
        await token.transfer(accounts[2], "1222");
      });

      it("should have a user audit for accounts[1]", async function () {
        const audit1 = await core.auditUser(core.address, 0, 2);
        assert.equal(audit1[0], "0", "createdAt");
        assert.equal(audit1[1], "0", "lastTransactionAt");
        assert.equal(audit1[2], "0", "lastEmissionAt");
        assert.equal(audit1[3], "0", "lastReceptionAt");
        assert.equal(audit1[4], "0", "cumulatedEmission");
        assert.equal(audit1[5], "3333", "cumulatedReception");
      });

      it("should allow accounts[1] to transfer tokens from accounts 2", async function () {
        const tx = await token.transfer(accounts[1], "1000", { from: accounts[2] });
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "Transfer", "event");
        assert.equal(tx.logs[0].args.from, accounts[2], "from");
        assert.equal(tx.logs[0].args.to, accounts[1], "to");
        assert.equal(tx.logs[0].args.value.toString(), "1000", "value");
      });

      it("should prevent accounts[1] to receive too many tokens from account 0", async function () {
        await assertRevert(token.transfer(accounts[1], "1"), "CO03");
      });

      it("should prevent accounts[3] to receive any tokens", async function () {
        await assertRevert(token.transfer(accounts[3], "1"), "CO03");
      });
    });
  });
});
