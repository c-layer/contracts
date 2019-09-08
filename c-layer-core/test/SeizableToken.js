"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const SeizableTokenDelegate = artifacts.require("SeizableTokenDelegate.sol");

const NEXT_YEAR = Math.round(new Date().getTime() / 1000, 0) + (365 * 3600 * 24);
const AMOUNT = 1000000;
const CHF = web3.utils.toHex("CHF");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;

contract("SeizableToken", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await SeizableTokenDelegate.new();
    core = await TokenCore.new("Test", [ delegate.address ]);

    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    await core.defineSupply(token.address, AMOUNT);
    await token.transfer(accounts[1], AMOUNT);
  });

  it("should let operator seize 1 token", async function () {
    const tx = await core.seize(token.address, accounts[1], "1");
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Seize", "event");
    assert.equal(tx.logs[0].args.amount, 1, "amount");

    const tokenEvents = await token.getPastEvents("allEvents", {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber
    });
    assert.equal(tokenEvents.length, 1, "events");
    assert.equal(tokenEvents[0].event, "Transfer", "event");
    assert.equal(tokenEvents[0].args.from, accounts[1], "from");
    assert.equal(tokenEvents[0].args.to, accounts[0], "to");
    assert.equal(tokenEvents[0].args.value, 1, "value");
  });

  it("should let operator seize all tokens", async function () {
    const tx = await core.seize(token.address, accounts[1], AMOUNT);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Seize", "event");
    assert.equal(tx.logs[0].args.amount, AMOUNT, "amount");

    const tokenEvents = await token.getPastEvents("allEvents", {
      fromBlock: tx.logs[0].blockNumber,
      toBlock: tx.logs[0].blockNumber
    });
    assert.equal(tokenEvents.length, 1, "events");
    assert.equal(tokenEvents[0].event, "Transfer", "event");
    assert.equal(tokenEvents[0].args.from, accounts[1], "from");
    assert.equal(tokenEvents[0].args.to, accounts[0], "to");
    assert.equal(tokenEvents[0].args.value, AMOUNT, "value");
  });

  it("should prevent operator to mint too many tokens", async function () {
    await assertRevert(core.seize(token.address, accounts[1], AMOUNT + 1), "CO02");
  });

  it("should prevent non operator to mint", async function () {
    await assertRevert(
      core.seize(token.address, accounts[1], 1, { from: accounts[2] }),
      "OC03");
  });

  describe("With token seized", function () {
    beforeEach(async function () {
      await core.seize(token.address, accounts[1], AMOUNT);
    });

    it("should have an all time seized", async function () {
      const data = await core.token(token.address);
      assert.equal(data.allTimeSeized.toString(), "" + AMOUNT, "all time seized");
    });

    it("should prevent operator to seize itself", async function () {
      await assertRevert(core.seize(token.address, accounts[0], 1, { from: accounts[0] }), "CO02");
    });

    it("should have the same total supply", async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), AMOUNT);
    });
  });
});
