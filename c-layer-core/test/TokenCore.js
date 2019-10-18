"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
const TKN = web3.utils.toHex("TKN").padEnd(66, "0");

contract("TokenCore", function (accounts) {
  let token, core, delegate, userRegistry, ratesProvider;

  beforeEach(async function () {
    delegate = await TokenDelegate.new();
    core = await TokenCore.new("Test", [delegate.address]);
    userRegistry = await UserRegistryMock.new(
      [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
    ratesProvider = await RatesProviderMock.new();
  });

  it("should have a name", async function () {
    const name = await core.name();
    assert.equal(name, "Test", "name");
  });

  it("should have no oracles", async function () {
    const oracles = await core.oracles();
    assert.equal(oracles[0], NULL_ADDRESS, "user registry");
    assert.equal(oracles[1], NULL_ADDRESS, "ratesProvider");
    assert.equal(oracles[2], EMPTY_BYTES, "currency");
    assert.equal(oracles[3].length, 0, "keys");
  });

  it("should let define oracles", async function () {
    const tx = await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "OraclesDefined", "event");
    assert.equal(tx.logs[0].args.userRegistry, userRegistry.address, "user registry");
    assert.equal(tx.logs[0].args.ratesProvider, ratesProvider.address, "rates provider");
    assert.equal(tx.logs[0].args.currency.toString(), CHF, "currency");
    assert.deepEqual(tx.logs[0].args.userKeys.map((x) => x.toString()), ["0", "1"], "keys");
  });

  describe("With oracles defined", async function () {
    beforeEach(async function () {
      await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
    });

    it("should not let define a user registry with a different currency", async function () {
      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], TKN, [5, 5000000]);
      await assertRevert(core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]), "TC01");
    });

    it("should have oracles", async function () {
      const oracles = await core.oracles();

      assert.equal(oracles[0], userRegistry.address, "user registry");
      assert.equal(oracles[1], ratesProvider.address, "ratesProvider");
      assert.equal(oracles[2], CHF, "currency");
      assert.deepEqual(oracles[3].map((x) => x.toString()), ["0", "1"], "keys");
    });
  });

  it("should have no audit selector for core scope 0 and account 0 and 1", async function () {
    const auditSelector = await core.auditSelector(core.address, 0, [accounts[0], accounts[1]]);
    assert.deepEqual(auditSelector, [false, false], "auditSelector");
  });

  it("should let define audit selector for core scope 0 and account 0 and 1", async function () {
    const tx = await core.defineAuditSelector(
      core.address, 42, [accounts[0], accounts[1]], [true, true]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1, "logs");
    assert.equal(tx.logs[0].event, "AuditSelectorDefined", "event");
    assert.equal(tx.logs[0].args.scope, core.address, "scope");
    assert.equal(tx.logs[0].args.scopeId, 42, "scopeId");
    assert.deepEqual(tx.logs[0].args.addresses, [accounts[0], accounts[1]], "addresses");
    assert.deepEqual(tx.logs[0].args.values, [true, true], "values");
  });

  it("should let define a token", async function () {
    token = await TokenProxy.new(core.address);
    const tx = await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1, "logs");
    assert.equal(tx.logs[0].event, "TokenDefined", "event");
    assert.equal(tx.logs[0].args.token, token.address, "token");
    assert.equal(tx.logs[0].args.delegateId, 0, "delegateId");
    assert.equal(tx.logs[0].args.name, NAME, "name");
    assert.equal(tx.logs[0].args.symbol, SYMBOL, "symbol");
    assert.equal(tx.logs[0].args.decimals, DECIMALS, "decimals");
  });

  describe("With a token defined", function () {
    let token;

    beforeEach(async function () {
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
    });

    it("should let remove token", async function () {
      const tx = await core.removeToken(token.address);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "TokenRemoved", "event");
      assert.equal(tx.logs[0].args.token, token.address, "token");
    });

    describe("With the token removed", function () {
      beforeEach(async function () {
        await core.removeToken(token.address);
      });

      it("Should have no delegates", async function () {
        const delegate = await core.proxyDelegates(token.address);
        assert.equal(delegate, NULL_ADDRESS, "no delegates");
      });

      it("should have no name", async function () {
        const name = await token.name();
        assert.equal(name, "", "no names");
      });

      it("should have no symbol", async function () {
        const symbol = await token.symbol();
        assert.equal(symbol, "", "no symbol");
      });

      it("should have no decimals", async function () {
        const decimals = await token.decimals();
        assert.equal(decimals, "0", "no decimals");
      });

      it("should have no supply", async function () {
        const supply = await token.totalSupply();
        assert.equal(supply, "0", "no supplies");
      });
    });
  });
});
