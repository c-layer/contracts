"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const MintableTokenDelegate = artifacts.require("MintableTokenDelegate.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");

const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const NAME = "Token";
const SYMBOL = "TKN";
const SYMBOL_BYTES = web3.utils.toHex(SYMBOL).padEnd(66, "0");
const DECIMALS = 18;
const TOTAL_SUPPLY = "1000000";
const CHF = "CHF";
const CHF_BYTES = web3.utils.toHex("CHF").padEnd(66, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);

const CORE_GAS_COST = 4510002;
const MINTABLE_DELEGATE_GAS_COST = 1663879;
const DELEGATE_GAS_COST = 3334284;
const PROXY_GAS_COST = 824865;

const MINTABLE_FIRST_TRANSFER_COST = 64346;
const MINTABLE_FIRST_TRANSFER_FROM_COST = 76256;
const MINTABLE_TRANSFER_COST = 48866;
const FIRST_TRANSFER_COST = 82927;
const FIRST_TRANSFER_FROM_COST = 94815;
const TRANSFER_COST = 67447;
const ISSUANCE_AUDITED_FIRST_TRANSFER_COST = 290941;
const ISSUANCE_AUDITED_FIRST_TRANSFER_FROM_COST = 302829;
const ISSUANCE_AUDITED_TRANSFER_COST = 177372;
const ISSUANCE_AUDITED_FIRST_TRANSFER_AFTER_COST = 140019;
const ISSUANCE_AUDITED_TRANSFER_AFTER_COST = 100390;
const AUDITED_FIRST_TRANSFER_COST = 261433;
const AUDITED_FIRST_TRANSFER_FROM_COST = 273321;
const AUDITED_TRANSFER_COST = 169354;
const AUDITED_FIRST_TRANSFER_AFTER_COST = 271388;
const AUDITED_TRANSFER_AFTER_COST = 183644;

// const AUDIT_MODE_NEVER = 0;
const AUDIT_MODE_ALWAYS = 1;
const AUDIT_MODE_ALWAYS_TRIGGERS_EXCLUDED = 2;
// const AUDIT_MODE_TRIGGERS_ONLY = 3;
const AUDIT_MODE_WHEN_TRIGGERS_MATCHED = 4;
// const AUDIT_MODE_WHEN_TRIGGERS_UNMATCHED = 5;

const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
// const AUDIT_STORAGE_SHARED = 2;

contract("Performance", function (accounts) {
  let userRegistry, ratesProvider;
  let core;

  before(async function () {
    ratesProvider = await RatesProviderMock.new("Test");
    await ratesProvider.defineCurrencies([CHF_BYTES, SYMBOL_BYTES], ["0" , "0"], "100");
    await ratesProvider.defineRates(["150"]);
    userRegistry = await UserRegistryMock.new("Test", CHF_BYTES, accounts, NEXT_YEAR);
    await userRegistry.updateUserAllExtended(1, ["5", "50000", "50000"]);
    await userRegistry.updateUserAllExtended(2, ["5", "50000", "50000"]);
    await userRegistry.updateUserAllExtended(3, ["5", "50000", "50000"]);
  });

  it("should have a core gas cost at " + CORE_GAS_COST, async function () {
    const gas = await TokenCore.new.estimateGas("Test", [accounts[0]]);
    assert.equal(gas, CORE_GAS_COST, "gas");
  });

  it("should have a mintable delegate gas cost at " + MINTABLE_DELEGATE_GAS_COST, async function () {
    const gas = await MintableTokenDelegate.new.estimateGas();
    assert.equal(gas, MINTABLE_DELEGATE_GAS_COST, "gas");
  });

  it("should have a mintable C delegate gas cost at " + DELEGATE_GAS_COST, async function () {
    const gas = await TokenDelegate.new.estimateGas();
    assert.equal(gas, DELEGATE_GAS_COST, "gas");
  });

  it("should have a proxy gas cost at " + PROXY_GAS_COST, async function () {
    core = await TokenCore.new("Test", [accounts[0]]);
    const gas = await TokenProxy.new.estimateGas(core.address);
    assert.equal(gas, PROXY_GAS_COST, "gas");
  });

  describe("With delegates defined", function () {
    let delegates, token;

    beforeEach(async function () {
      delegates = await Promise.all([
        MintableTokenDelegate.new(), TokenDelegate.new(),
      ]);
      core = await TokenCore.new("Test", [accounts[0]]);

      await core.defineTokenDelegate(1, delegates[0].address, []);
      await core.defineTokenDelegate(2, delegates[1].address, [1, 2]);
      await core.defineOracle(userRegistry.address);
    });

    describe("With a mintable token defined", function () {
      beforeEach(async function () {
        token = await TokenProxy.new(core.address);
        await core.defineToken(
          token.address, 1, NAME, SYMBOL, DECIMALS);
        await core.mint(token.address, [accounts[0]], [TOTAL_SUPPLY]);
        await token.transfer(token.address, "3333");
        await token.approve(accounts[1], "3333");
      });

      it("should estimate a first transfer accounts[0]", async function () {
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, MINTABLE_FIRST_TRANSFER_COST, "estimate");
      });

      it("should estimate a first transfer from accounts[0]", async function () {
        const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], "3333", { from: accounts[1] });
        assert.equal(gas, MINTABLE_FIRST_TRANSFER_FROM_COST, "estimate");
      });

      // Later transfer does not have to allocate extra memory and should be cheaper
      it("should estimate more transfer from accounts[0]", async function () {
        await token.transfer(accounts[1], "3333");
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, MINTABLE_TRANSFER_COST, "estimate");
      });
    });

    describe("With a c token defined", function () {
      beforeEach(async function () {
        token = await TokenProxy.new(core.address);
        await core.defineToken(
          token.address, 2, NAME, SYMBOL, DECIMALS);
        await core.mint(token.address, [accounts[0]], [TOTAL_SUPPLY]);
        await token.transfer(token.address, "3333"); // force global variables init
        await token.approve(accounts[1], "3333");
      });

      it("should eval canTransfer Ok", async function () {
        const result = await token.canTransfer.call(accounts[0], accounts[1], 0);
        assert.equal(result, 1, "canTransfer");
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

      describe("With primary aml audit configuration", function () {
        beforeEach(async function () {
          await core.defineTokenDelegate(2, delegates[1].address, [0, 1]);
          await core.defineAuditConfiguration(0,
            0, false,
            AUDIT_MODE_ALWAYS, AUDIT_STORAGE_ADDRESS,
            [], [], NULL_ADDRESS, EMPTY_BYTES,
            [false, true, false, false]);
          await core.defineAuditConfiguration(1,
            0, true,
            AUDIT_MODE_WHEN_TRIGGERS_MATCHED, AUDIT_STORAGE_USER_ID,
            [1], [2], ratesProvider.address, CHF_BYTES,
            [true, false, false, true]);
          await core.defineAuditTriggers(
            1, [accounts[0]], [false], [true], [false]);
        });

        it("should assert canTransfer", async function () {
          const reason = await token.canTransfer(accounts[0], accounts[1], "3333");
          assert.equal(reason.toString(), "1", "should be transferable");
        });

        it("should estimate a first transfer accounts[0]", async function () {
          const gas = await token.transfer.estimateGas(accounts[1], "3333");
          assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_COST, "estimate");
        });

        it("should estimate a first transfer from accounts[0]", async function () {
          const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], "3333", { from: accounts[1] });
          assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_FROM_COST, "estimate");
        });

        // Later transfer does not have to allocate extra memory and should be cheaper
        it("should estimate more transfer from accounts[0]", async function () {
          await token.transfer(accounts[1], "3333");
          const gas = await token.transfer.estimateGas(accounts[1], "1111");
          assert.equal(gas, ISSUANCE_AUDITED_TRANSFER_COST, "estimate");
        });

        describe("and after issuance", function () {
          beforeEach(async function () {
            await token.transfer(accounts[1], "3333");
          });

          it("should assert canTransfer", async function () {
            const reason = await token.canTransfer(accounts[1], accounts[2], "1111");
            assert.equal(reason.toString(), "1", "should be transferable");
          });

          it("should estimate a first transfer by accounts[1] to acounts[2]", async function () {
            const gas = await token.transfer.estimateGas(accounts[2], "1111", { from: accounts[1] });
            assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_AFTER_COST, "estimate");
          });

          it("should estimate more transfer by accounts[1] to acounts[2]", async function () {
            await token.transfer(accounts[2], "1111", { from: accounts[1] });
            const gas = await token.transfer.estimateGas(accounts[2], "1111", { from: accounts[1] });
            assert.equal(gas, ISSUANCE_AUDITED_TRANSFER_AFTER_COST, "estimate");
          });
        });
      });

      describe("With secondary aml audit configuration", function () {
        beforeEach(async function () {
          await core.defineTokenDelegate(2, delegates[1].address, [0, 1]);
          await core.defineAuditConfiguration(0,
            0, false,
            AUDIT_MODE_ALWAYS, AUDIT_STORAGE_ADDRESS,
            [], [], NULL_ADDRESS, EMPTY_BYTES,
            [false, true, false, false]);
          await core.defineAuditConfiguration(1,
            0, true,
            AUDIT_MODE_ALWAYS_TRIGGERS_EXCLUDED, AUDIT_STORAGE_USER_ID,
            [1], [2], ratesProvider.address, CHF_BYTES,
            [true, false, true, true]);
          await core.defineAuditTriggers(
            1, [accounts[0]], [false], [true], [false]);
        });

        it("should assert canTransfer", async function () {
          const reason = await token.canTransfer(accounts[0], accounts[1], "3333");
          assert.equal(reason.toString(), "1", "should be transferable");
        });

        it("should estimate a first transfer accounts[0]", async function () {
          const gas = await token.transfer.estimateGas(accounts[1], "3333");
          assert.equal(gas, AUDITED_FIRST_TRANSFER_COST, "estimate");
        });

        it("should estimate a first transfer from accounts[0]", async function () {
          const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], "3333", { from: accounts[1] });
          assert.equal(gas, AUDITED_FIRST_TRANSFER_FROM_COST, "estimate");
        });

        // Later transfer does not have to allocate extra memory and should be cheaper
        it("should estimate more transfer from accounts[0]", async function () {
          await token.transfer(accounts[1], "3333");
          const gas = await token.transfer.estimateGas(accounts[1], "3333");
          assert.equal(gas, AUDITED_TRANSFER_COST, "estimate");
        });

        describe("and after issuance", function () {
          beforeEach(async function () {
            await token.transfer(accounts[1], "3333");
          });

          it("should assert canTransfer", async function () {
            const reason = await token.canTransfer(accounts[1], accounts[2], "1111");
            assert.equal(reason.toString(), "1", "should be transferable");
          });

          it("should estimate a first transfer by accounts[1] to acounts[2]", async function () {
            const gas = await token.transfer.estimateGas(accounts[2], "1111", { from: accounts[1] });
            assert.equal(gas, AUDITED_FIRST_TRANSFER_AFTER_COST, "estimate");
          });

          it("should estimate more transfer by accounts[1] to acounts[2]", async function () {
            await token.transfer(accounts[2], "1111", { from: accounts[1] });
            const gas = await token.transfer.estimateGas(accounts[2], "1111", { from: accounts[1] });
            assert.equal(gas, AUDITED_TRANSFER_AFTER_COST, "estimate");
          });
        });
      });
    });
  });
});
