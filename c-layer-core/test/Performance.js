"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const MintableTokenDelegate = artifacts.require("MintableTokenDelegate.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");

const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

const CORE_GAS_COST = 3988223;
const DELEGATE_GAS_COST = 1557491;
const C_DELEGATE_GAS_COST = 4123092;
const PROXY_GAS_COST = 906187;

const FIRST_TRANSFER_COST = 58713;
const FIRST_TRANSFER_FROM_COST = 66427;
const TRANSFER_COST = 43233;
const C_FIRST_TRANSFER_COST = 93788;
const C_FIRST_TRANSFER_FROM_COST = 101503;
const C_TRANSFER_COST = 62828;

contract("Performance", function (accounts) {
  let core, delegate;

  it("should have a core gas cost at " + CORE_GAS_COST, async function () {
    const gas = await TokenCore.new.estimateGas("Test", accounts);
    assert.equal(gas, CORE_GAS_COST, "gas");
  });

  it("should have a mintable delegate gas cost at " + DELEGATE_GAS_COST, async function () {
    const gas = await MintableTokenDelegate.new.estimateGas();
    assert.equal(gas, DELEGATE_GAS_COST, "gas");
  });

  it("should have a mintable C delegate gas cost at " + DELEGATE_GAS_COST, async function () {
    const gas = await TokenDelegate.new.estimateGas();
    assert.equal(gas, C_DELEGATE_GAS_COST, "gas");
  });

  it("should have a proxy gas cost at " + PROXY_GAS_COST, async function () {
    core = await TokenCore.new("Test", []);
    const gas = await TokenProxy.new.estimateGas(core.address);
    assert.equal(gas, PROXY_GAS_COST, "gas");
  });

  describe("With a mintable token defined", function () {
    let token;

    beforeEach(async function () {
      delegate = await MintableTokenDelegate.new();
      core = await TokenCore.new("Test", [delegate.address]);
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
    });

    describe("With supplies defined", function () {
      const TOTAL_SUPPLY = "1000000";

      beforeEach(async function () {
        await core.mint(token.address, accounts[0], TOTAL_SUPPLY);
        await token.transfer(token.address, "3333");
        await token.approve(accounts[1], "3333");
      });

      it("should estimate a first transfer accounts[0]", async function () {
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, FIRST_TRANSFER_COST, "estimate");
      });

      it("should estimate a first transfer from accounts[0]", async function () {
        const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], "3333", { from: accounts[1] });
        assert.equal(gas, FIRST_TRANSFER_FROM_COST, "estimate");
      });

      // Later transfer does not have to allocate extra memory and should be cheaper
      it("should estimate more transfer from accounts[0]", async function () {
        await token.transfer(accounts[1], "3333");
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, TRANSFER_COST, "estimate");
      });
    });
  });

  describe("With a mintable C token defined", function () {
    let token;

    beforeEach(async function () {
      delegate = await TokenDelegate.new();
      core = await TokenCore.new("Test", [delegate.address]);
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
    });

    describe("With supplies defined", function () {
      const TOTAL_SUPPLY = "1000000";

      beforeEach(async function () {
        await core.mint(token.address, accounts[0], TOTAL_SUPPLY);
        await token.transfer(token.address, "3333"); // force global variables init
        await token.approve(accounts[1], "3333");
      });

      it("should estimate a first transfer accounts[0]", async function () {
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, C_FIRST_TRANSFER_COST, "estimate");
      });

      it("should estimate a first transfer from accounts[0]", async function () {
        const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], "3333", { from: accounts[1] });
        assert.equal(gas, C_FIRST_TRANSFER_FROM_COST, "estimate");
      });

      // Later transfer does not have to allocate extra memory and should be cheaper
      it("should estimate more transfer from accounts[0]", async function () {
        await token.transfer(accounts[1], "3333");
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, C_TRANSFER_COST, "estimate");
      });
    });
  });
});
