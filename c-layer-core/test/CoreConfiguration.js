"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const MintableTokenDelegate = artifacts.require("MintableTokenDelegate.sol");
const TokenDelegate = artifacts.require("TokenDelegate.sol");
const TokenCore = artifacts.require("TokenCore.sol");
const CoreConfiguration = artifacts.require("CoreConfiguration.sol");

const CHF = web3.utils.toHex("CHF").padEnd(66, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const CORE_CONFIG_ROLE = web3.utils.fromAscii("CoreConfigRole").padEnd(66, "0");
const REQUIRED_CORE_PRIVILEGES = [
  web3.utils.sha3("defineAuditConfiguration(" +
    "uint256,uint256,bool,uint8,uint8,uint256[],address,bytes32,bool[6])"),
  web3.utils.sha3("defineTokenDelegate(uint256,address,uint256[])"),
].map((x) => x.substr(0, 10));

contract("CoreConfiguration", function (accounts) {
  let mintableDelegate, compliantDelegate;
  let core, coreConfig;

  beforeEach(async function () {
    mintableDelegate = await MintableTokenDelegate.new();
    compliantDelegate = await TokenDelegate.new();
    core = await TokenCore.new("MyCore");
  });

  it("should create a core configuration", async function () {
    coreConfig = await CoreConfiguration.new();
    assert.ok(coreConfig.address !== NULL_ADDRESS, "coreConfig");
  });

  describe("With a core configuration", function () {
    beforeEach(async function () {
      coreConfig = await CoreConfiguration.new();
    });

    it("should not have core access", async function () {
      const access = await coreConfig.hasCoreAccess(core.address);
      assert.ok(!access, "not access");
    });

    it("should prevent configuring core without access", async function () {
      await assertRevert(coreConfig.defineCoreConfigurations(
        core.address,
        mintableDelegate.address,
        compliantDelegate.address,
        accounts[2],
        CHF), "CC01");
    });

    describe("With privileges defined", function () {
      beforeEach(async function () {
        await core.defineRole(CORE_CONFIG_ROLE, REQUIRED_CORE_PRIVILEGES);
        await core.assignOperators(CORE_CONFIG_ROLE, [coreConfig.address]);
      });

      it("should have core access", async function () {
        const access = await coreConfig.hasCoreAccess(core.address);
        assert.ok(access, "access");
      });

      it("should configure the core", async function () {
        const tx = await coreConfig.defineCoreConfigurations(
          core.address,
          mintableDelegate.address,
          compliantDelegate.address,
          accounts[2],
          CHF);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 0);
      });

      describe("With a core configured", function () {
        beforeEach(async function () {
          await coreConfig.defineCoreConfigurations(
            core.address,
            mintableDelegate.address,
            compliantDelegate.address,
            accounts[2],
            CHF);
        });

        it("should have audit configurations", async function () {
          const a = await core.auditConfiguration(2);
          assert.equal(a.scopeId.toString(), 0, "scopeId");
          assert.ok(a.scopeCore, "scopeCore");
          assert.equal(a.mode.toString(), 2, "auditMode");
          assert.equal(a.storageMode.toString(), 1, "auditStorage");
          assert.deepEqual(a.userKeys.map((x) => x.toString()), ["0", "1", "2"], "user keys");
          assert.equal(a.ratesProvider, accounts[2], "ratesProvider");
          assert.equal(a.currency, CHF, "currency");
          assert.deepEqual(a.fields, [false, false, false, false, false, true], "fields");
        });

        it("should have delegate configurations", async function () {
          const d = await core.delegates(1);
          assert.equal(d, mintableDelegate.address, "d1");
        });
      });
    });
  });
});
