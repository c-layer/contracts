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
const DECIMALS = 18;
const TOTAL_SUPPLY = "1000000";
const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");

const CORE_GAS_COST = 4795167;
const MINTABLE_DELEGATE_GAS_COST = 1849701;
const DELEGATE_GAS_COST = 4833778;
const PROXY_GAS_COST = 883512;

const MINTABLE_FIRST_TRANSFER_COST = 60295;
const MINTABLE_FIRST_TRANSFER_FROM_COST = 69614;
const MINTABLE_TRANSFER_COST = 44815;
const FIRST_TRANSFER_COST = 69742;
const FIRST_TRANSFER_FROM_COST = 79038;
const TRANSFER_COST = 54262;
const ISSUANCE_AUDITED_FIRST_TRANSFER_COST = 0;
const ISSUANCE_AUDITED_FIRST_TRANSFER_FROM_COST = 0;
const ISSUANCE_AUDITED_TRANSFER_COST = 0;
const ISSUANCE_AUDITED_FIRST_TRANSFER_AFTER_COST = 0;
const ISSUANCE_AUDITED_TRANSFER_AFTER_COST = 0;
const AUDITED_FIRST_TRANSFER_COST = 122173;
const AUDITED_FIRST_TRANSFER_FROM_COST = 131469;
const AUDITED_TRANSFER_COST = 75732;
const AUDITED_FIRST_TRANSFER_AFTER_COST = 0;
const AUDITED_TRANSFER_AFTER_COST = 0;

// const AUDIT_MODE_NEVER = 0;
const AUDIT_MODE_ALWAYS = 1;
const AUDIT_MODE_ALWAYS_TRIGGERS_EXCLUDED = 2;
// const AUDIT_MODE_ALWAYS_TRIGGERS_ONLY = 3;
const AUDIT_MODE_WHEN_TRIGGERS_MATCHED = 4;
// const AUDIT_MODE_WHEN_TRIGGERS_UNMATCHED = 5;

const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
// const AUDIT_STORAGE_SHARED = 2;

contract("Performance", function (accounts) {
  let userRegistry, ratesProvider;
  let core;

  before(async function () {
    userRegistry = await UserRegistryMock.new(
      [accounts[0], accounts[1], accounts[2]], CHF, [5, 500000, 500000]);
    ratesProvider = await RatesProviderMock.new();
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
      await core.defineTokenDelegate(2, delegates[1].address, [0, 1]);
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
            [], [2], ratesProvider.address, CHF,
            [true, false, false, true]);
          await core.defineAuditTriggers(
            1, [accounts[0]], [true], [false], [false]);
          const reason = await token.canTransfer(accounts[0], accounts[1], "3333");
          console.log(reason.toString());
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
            const reason = await token.canTransfer(accounts[0], accounts[1], "3333");
            console.log(reason.toString());
            [1, 2, 3].forEach(async function (i) {
              const auditId = await core.audit(core.address,
                0, AUDIT_STORAGE_USER_ID, ("0x" + (i + "").padStart(64, "0")));
              const auditAddress = await core.audit(token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[i - 1]);
              console.log("Before - Id= [" + i + "] : " + JSON.stringify(auditId));
              console.log("Before - Address= [" + i + "] : " + JSON.stringify(auditAddress));
            });
          });

          afterEach(async function () {
            [1, 2, 3].forEach(async function (i) {
              const auditId = await core.audit(core.address,
                0, AUDIT_STORAGE_USER_ID, ("0x" + (i + "").padStart(64, "0")));
              const auditAddress = await core.audit(token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[i - 1]);
              console.log("After - Id= [" + i + "] : " + JSON.stringify(auditId));
              console.log("After - Address= [" + i + "] : " + JSON.stringify(auditAddress));
            });
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
            [1], [2], ratesProvider.address, CHF,
            [true, false, true, true]);
          await core.defineAuditTriggers(
            1, [accounts[0]], [true], [false], [false]);
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
            const reason = await token.canTransfer(accounts[1], accounts[2], "1111");
            console.log(reason.toString());
            [1, 2, 3].forEach(async function (i) {
              const auditId = await core.audit(core.address,
                0, AUDIT_STORAGE_USER_ID, ("0x" + (i + "").padStart(64, "0")));
              const auditAddress = await core.audit(token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[i - 1]);
              console.log("Before - Id= [" + i + "] : " + JSON.stringify(auditId));
              console.log("Before - Address= [" + i + "] : " + JSON.stringify(auditAddress));
            });
          });

          afterEach(async function () {
            [1, 2, 3].forEach(async function (i) {
              const auditId = await core.audit(core.address,
                0, AUDIT_STORAGE_USER_ID, ("0x" + (i + "").padStart(64, "0")));
              const auditAddress = await core.audit(token.address, 0, AUDIT_STORAGE_ADDRESS, accounts[i - 1]);
              console.log("After - Id= [" + i + "] : " + JSON.stringify(auditId));
              console.log("After - Address= [" + i + "] : " + JSON.stringify(auditAddress));
            });
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
