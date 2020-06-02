"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const OracleEnrichedDelegate = artifacts.require("OracleEnrichedDelegate.sol");
const OracleEnrichedDelegateMock = artifacts.require("OracleEnrichedDelegateMock.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");

contract("OracleEnrichedDelegate", function (accounts) {
  let core, delegate, userRegistry, ratesProvider;

  describe("With a mock token delegates defined", function () {
    beforeEach(async function () {
      delegate = await OracleEnrichedTokenDelegateMock.new();
    });

    it("should have audit requirements", async function () {
      const auditRequirements = await delegate.auditRequirements();
      assert.equal(auditRequirements.toString(), 0, "audit requirements");
    });

    it("should fail to fetch caller user", async function () {
      await assertRevert(delegate.testFetchCallerUser(accounts[0], [0, 1, 2]), "CO03");
    });

    it("should fail to fetch sender user", async function () {
      await assertRevert(delegate.testFetchSenderUser(accounts[0], [0, 1, 2]), "CO03");
    });

    it("should fail to fetch receiver user", async function () {
      await assertRevert(delegate.testFetchReceiverUser(accounts[0], [0, 1, 2]), "CO03");
    });

    it("should fetch converted value for 0", async function () {
      const convertedValue = await delegate.testFetchConvertedValue(0, NULL_ADDRESS, EMPTY_BYTES);
      assert.equal(convertedValue, "0", "convertedValue");
    });

    it("should failed to fetch converted value for 100", async function () {
      await assertRevert(delegate.testFetchConvertedValue(100, NULL_ADDRESS, EMPTY_BYTES), "CO03");
    });

    describe("with user registry and ratesProvider defined", function () {
      beforeEach(async function () {
        ratesProvider = await RatesProviderMock.new();
        userRegistry = await UserRegistryMock.new(
          [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000, 5000000]);
        await delegate.defineOracleMock(userRegistry.address);
      });

      it("should fetch caller user", async function () {
        const callerUser = await delegate.testFetchCallerUser(accounts[0], [0, 1, 2]);
        assert.equal(callerUser[0], "1", "caller Id");
        assert.deepEqual(callerUser[1].map((x) => x.toString()), ["5", "5000000", "5000000"], "caller keys");
        assert.equal(callerUser[2], true, "caller fetched");
      });

      it("should fetch sender user", async function () {
        const senderUser = await delegate.testFetchSenderUser(accounts[0], [0, 1, 2]);
        assert.equal(senderUser[0], "1", "sender Id");
        assert.deepEqual(senderUser[1].map((x) => x.toString()), ["5", "5000000", "5000000"], "sender keys");
        assert.equal(senderUser[2], true, "sender fetched");
      });

      it("should fetch receiver user", async function () {
        const receiverUser = await delegate.testFetchReceiverUser(accounts[0], [0, 1, 2]);
        assert.equal(receiverUser[0], "1", "receiver Id");
        assert.deepEqual(receiverUser[1].map((x) => x.toString()), ["5", "5000000", "5000000"], "receiver keys");
        assert.equal(receiverUser[2], true, "receiver fetched");
      });

      it("should fetch converted value", async function () {
        const convertedValue = await delegate.testFetchConvertedValue(100, ratesProvider.address, CHF);
        assert.equal(convertedValue, "150", "convertedValue");
      });
    });
  });

  describe("With oracles and a token defined", function () {
    let token;

    beforeEach(async function () {
      delegate = await OracleEnrichedTokenDelegate.new();
      core = await TokenCoreMock.new("Test", [accounts[0]]);
      await core.defineTokenDelegate(1, delegate.address, []);
      userRegistry = await UserRegistryMock.new(
        [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000, 5000000]);
      ratesProvider = await RatesProviderMock.new();
      await core.defineOracle(userRegistry.address);

      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 1, NAME, SYMBOL, DECIMALS);
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
          await assertRevert(token.transferFrom(accounts[0], accounts[1], "3334", { from: accounts[1] }), "CO03");
        });
      });
    });
  });
});
