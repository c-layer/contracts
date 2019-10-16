"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const OracleEnrichedTokenDelegate = artifacts.require("OracleEnrichedTokenDelegate.sol");
const OracleEnrichedTokenDelegateMock = artifacts.require("OracleEnrichedTokenDelegateMock.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const NULL_ADDRESS = "0x".padEnd(42, "0");
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

contract("OracleEnrichedTokenDelegate", function (accounts) {
  let core, delegate, userRegistry, ratesProvider;

  describe("With a mock token delegates defined", function () {
    beforeEach(async function () {
      delegate = await OracleEnrichedTokenDelegateMock.new();
    });

    it("should read transfer data with no enrichement", async function () {
      const transferData = await delegate.readTransferDataMock(
        delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
        [false, false, false, false, false, false, false]);
      assert.deepEqual(transferData[0],
        [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
      assert.deepEqual(transferData[1].map((x) => x.toString()),
        ["0", "0", "0", "42", "0"], "transfer data - values");
    });

    it("should fail to read transfer data with user registry enrichement", async function () {
      await assertRevert(delegate.readTransferDataMock(
        delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
        [true, true, true, true, true, true, false]), "CO03");
    });

    it("should fail to read transfer data with rates provider enrichement", async function () {
      await assertRevert(delegate.readTransferDataMock(
        delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
        [false, false, false, false, false, false, true]), "CO03");
    });

    describe("with user registry defined", function () {
      beforeEach(async function () {
        userRegistry = await UserRegistryMock.new(
          [accounts[0], accounts[1], accounts[2]], [5, 5000000]);
        await delegate.defineOraclesMock(userRegistry.address, NULL_ADDRESS, [0, 1]);
      });

      it("should read transfer data with no enrichement", async function () {
        const transferData = await delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [false, false, false, false, false, false, false]);
        assert.deepEqual(transferData[0],
          [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
        assert.deepEqual(transferData[1].map((x) => x.toString()),
          ["0", "0", "0", "42", "0"], "transfer data - values");
      });

      it("should read transfer data with user registry enrichement for user ids only", async function () {
        const transferData = await delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [true, false, true, false, true, false, false]);
        assert.deepEqual(transferData[0],
          [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
        assert.deepEqual(transferData[1].map((x) => x.toString()),
          ["1", "2", "3", "42", "0"], "transfer data - values");
      });

      it("should read transfer data with user registry enrichement", async function () {
        const transferData = await delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [true, true, true, true, true, true, false]);
        assert.deepEqual(transferData[0],
          [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
        assert.deepEqual(transferData[1].map((x) => x.toString()),
          ["1", "2", "3", "42", "0", "5", "5000000", "5", "5000000", "5", "5000000"], "transfer data - values");
      });

      it("should fail to read transfer data with rates provider enrichement", async function () {
        await assertRevert(delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [false, false, false, false, false, false, true]), "CO03");
      });
    });

    describe("with rates provider defined", function () {
      beforeEach(async function () {
        userRegistry = await UserRegistryMock.new(
          [accounts[0], accounts[1], accounts[2]], [5, 5000000]);
        ratesProvider = await RatesProviderMock.new();
        await delegate.defineOraclesMock(NULL_ADDRESS, ratesProvider.address, []);
      });

      it("should read transfer data with no enrichement", async function () {
        const transferData = await delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [false, false, false, false, false, false, false]);
        assert.deepEqual(transferData[0],
          [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
        assert.deepEqual(transferData[1].map((x) => x.toString()),
          ["0", "0", "0", "42", "0"], "transfer data - values");
      });

      it("should fail to read transfer data with user registry enrichement", async function () {
        await assertRevert(delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [true, true, true, true, true, true, false]), "CO03");
      });

      it("should read transfer data with rates provider enrichement", async function () {
        const transferData = await delegate.readTransferDataMock(
          delegate.address, [accounts[0], accounts[1], accounts[2]], "42",
          [false, false, false, false, false, false, true]);
        assert.deepEqual(transferData[0],
          [delegate.address, accounts[0], accounts[1], accounts[2]], "transfer data - address");
        assert.deepEqual(transferData[1].map((x) => x.toString()),
          ["0", "0", "0", "42", "63"], "transfer data - values");
      });
    });
  });

  describe("With oracles and a token defined", function () {
    let token;

    beforeEach(async function () {
      delegate = await OracleEnrichedTokenDelegate.new();
      core = await TokenCoreMock.new("Test", [delegate.address]);
      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], [5, 5000000]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracles(userRegistry.address, ratesProvider.address, [0, 1]);
      
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
    });

    it("should have a core for token", async function () {
      const coreAddress = await token.core();
      assert.equal(coreAddress, core.address, "core");
    });

    it("should have no total supply for token", async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), 0, "supply");
    });

    it("should have no balance for accounts[0]", async function () {
      const balance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), 0, "balance");
    });

    it("should have no allowance for accounts[0] to accounts[1]", async function () {
      const allowance = await token.allowance(accounts[0], accounts[1]);
      assert.equal(allowance.toString(), 0, "allowance");
    });

    describe("With supplies defined", function () {
      const TOTAL_SUPPLY = "1000000";

      beforeEach(async function () {
        await core.defineSupplyMock(token.address, TOTAL_SUPPLY);
      });

      it("should have a total supply for token", async function () {
        const supply = await token.totalSupply();
        assert.equal(supply.toString(), TOTAL_SUPPLY, "supply");
      });

      it("should have a balance for accounts[0]", async function () {
        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.toString(), TOTAL_SUPPLY, "balance");
      });

      it("should have no balance for accounts[1] and accounts[2]", async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        assert.equal(balance1.toString(), 0, "balance");
        const balance2 = await token.balanceOf(accounts[2]);
        assert.equal(balance2.toString(), 0, "balance");
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

      it("should prevent transfer too much from accounts[0]", async function () {
        await assertRevert(token.transfer(accounts[1], "1000001"), "CO03");
      });

      it("should let accounts[0] provide allowance to accounts[1]", async function () {
        const tx = await token.approve(accounts[1], "3333");
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "Approval", "event");
        assert.equal(tx.logs[0].args.owner, accounts[0], "owner");
        assert.equal(tx.logs[0].args.spender, accounts[1], "spender");
        assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

        const allowance = await token.allowance(accounts[0], accounts[1]);
        assert.equal(allowance.toString(), "3333", "allowance");
      });

      describe("With an allowance from accounts[0] to accounts[1]", function () {
        beforeEach(async function () {
          await token.approve(accounts[1], "3333");
        });

        it("should allow accounts[1] to transferFrom accounts[0] tokens", async function () {
          const tx = await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Transfer", "event");
          assert.equal(tx.logs[0].args.from, accounts[0], "from");
          assert.equal(tx.logs[0].args.to, accounts[2], "to");
          assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

          const balance0 = await token.balanceOf(accounts[0]);
          assert.equal(balance0.toString(), "996667", "balance");
          const balance2 = await token.balanceOf(accounts[2]);
          assert.equal(balance2.toString(), "3333", "balance");

          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "0", "allowance");
        });

        it("should prevent transferFrom too much from accounts[0]", async function () {
          await assertRevert(token.transferFrom(accounts[0], accounts[1], "3334"), "CO03");
        });
      });
    });
  });
});
