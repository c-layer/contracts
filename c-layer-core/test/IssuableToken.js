"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const IssuableTokenDelegate = artifacts.require("IssuableTokenDelegate.sol");

const AMOUNT = 1000000;
const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;

contract("IssuableToken", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await IssuableTokenDelegate.new();
    core = await TokenCore.new("Test", [ delegate.address ], [ "0x0000" ]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
  });

  it("should let operator issue", async function () {
    const tx = await core.issue(token.address, AMOUNT);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Issue", "event");
    assert.equal(tx.logs[0].args.amount, AMOUNT, "amount");

    const tokenEvents = await token.getPastEvents("allEvents", {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber
    });
    assert.equal(tokenEvents.length, 1, "events");
    assert.equal(tokenEvents[0].event, "Transfer", "event");
    assert.equal(tokenEvents[0].returnValues.from, NULL_ADDRESS, "from");
    assert.equal(tokenEvents[0].returnValues.to, accounts[0], "to");
    assert.equal(tokenEvents[0].returnValues.value, AMOUNT, "value");
  });

  it("should prevent non operator to issue", async function () {
    await assertRevert(
      core.issue(token.address, AMOUNT, { from: accounts[1] }),
      "OC03");
  });

  describe("With tokens issued", function () {
    beforeEach(async function () {
      await core.issue(token.address, AMOUNT);
    });

    it("should have a total supply", async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), AMOUNT);
    });

    it("should have an all time issued", async function () {
      const tokenData = await core.token(token.address);
      assert.equal(tokenData.allTimeIssued.toString(), "" + AMOUNT, "allTimeIssued");
    });

    it("should let operator redeem", async function () {
      const tx = await core.redeem(token.address, AMOUNT);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Redeem", "event");
      assert.equal(tx.logs[0].args.amount, AMOUNT, "amount");

      const tokenEvents = await token.getPastEvents("allEvents", {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber
      });
      assert.equal(tokenEvents.length, 1, "events");
      assert.equal(tokenEvents[0].event, "Transfer", "event");
      assert.equal(tokenEvents[0].returnValues.from, accounts[0], "to");
      assert.equal(tokenEvents[0].returnValues.to, NULL_ADDRESS, "from");
      assert.equal(tokenEvents[0].returnValues.value, AMOUNT, "value");
    });

    it("should prevent non operator to redeem", async function () {
      await assertRevert(core.redeem(token.address, AMOUNT, { from: accounts[1] }), "OC03");
    });

    describe("With token redeemed", function () {
      beforeEach(async function () {
        await core.redeem(token.address, AMOUNT);
      });

      it("should have no total supply", async function () {
        const supply = await token.totalSupply();
        assert.equal(supply.toString(), 0);
      });

      it("should have an all time issued", async function () {
        const tokenData = await core.token(token.address);
        assert.equal(tokenData.allTimeRedeemed.toString(), "" + AMOUNT, "allTimeRedeemed");
      });
    });
  });
});
