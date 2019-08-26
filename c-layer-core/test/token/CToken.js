"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const CTokenProxy = artifacts.require("CTokenProxy.sol");
const CTokenCore = artifacts.require("CTokenCore.sol");
const CTokenDelegate = artifacts.require("CTokenDelegate.sol");

contract("CToken", function (accounts) {
  let core, delegatee;

  beforeEach(async function () {
    core = await CTokenCore.new();
    delegate = await CTokenDelegate.new();
 });

  describe("With a token defined", async function () {
    const NAME = "Token", SYMBOL = "TKN", DECIMALS = 18;
    let token;

    beforeEach(async function () {
      token = await CTokenProxy.new(core.address);
      await core.defineCToken(
        token.address, delegate.address,
        NAME, SYMBOL, DECIMALS);
    });

    it("should have a core for token", async function () {
      const coreAddress = await token.core();
      assert.equal(coreAddress, core.address, "core");
    });

    it("should have a name for token", async function () {
      const tokenName = await token.name();
      assert.equal(tokenName, NAME, "name");
    });

    it("should have a symbol for token", async function () {
      const tokenSymbol = await token.symbol();
      assert.equal(tokenSymbol, SYMBOL, "symbol");
    });

    it("should have decimals for token", async function () {
      const decimals = await token.decimals();
      assert.equal(decimals.toString(), DECIMALS, "decimals");
    });
  });
});
