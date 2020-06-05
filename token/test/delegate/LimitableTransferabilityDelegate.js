"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const LimitableTransferabilityDelegateMock =
  artifacts.require("LimitableTransferabilityDelegateMock.sol");

const UserRegistryMock = artifacts.require("UserRegistryMock.sol");
const RatesProviderMock = artifacts.require("RatesProviderMock.sol");

const SUPPLY = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const SYMBOL_BYTES = web3.utils.toHex(SYMBOL).padEnd(66, "0");
const DECIMALS = 18;
const CHF = "CHF";
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(66, "0");
const TOKEN_ADDRESS = "0x" + "123456789".padStart(40, "0");
const NULL_ADDRESS = "0x".padEnd(42, "0");
const EMPTY_BYTES = "0x".padEnd(66, "0");
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);

// Estimate
const ESTIMATE_NO_AUDIT_REQUIRED = 0;
const ESTIMATE_NO_AUDiT_UPDATE_AUDIT = 0;
const ESTIMATE_FULL_CONFIGS = 0;
const ESTIMATE_ONE_DATE_FIELD_AUDIT = 0;
const ESTIMATE_ONE_UINT_FIELD_AUDIT = 0;
const ESTIMATE_FOUR_FIELD_AUDIT = 0;

// Audit Mode
const AUDIT_NEVER = 0;
const AUDIT_ALWAYS = 1;
const AUDIT_ALWAYS_TRIGGERS_EXCLUDED = 2;
const AUDIT_TRIGGERS_ONLY = 3;
const AUDIT_WHEN_TRIGGERS_MATCHED = 4;
const AUDIT_WHEN_TRIGGERS_UNMATCHED = 5;

// Audit Storage
const AUDIT_STORAGE_ADDRESS = 0;
const AUDIT_STORAGE_USER_ID = 1;
const AUDIT_STORAGE_SHARED = 2;

contract("LimitableTransferabilityDelegate", function (accounts) {
  let delegate, userRegistry, ratesProvider;

  beforeEach(async function () {
    delegate = await LimitableTransferabilityDelegateMock.new();
    ratesProvider = await RatesProviderMock.new("Test");
    await ratesProvider.defineCurrencies([CHF_BYTES, SYMBOL_BYTES], ["0" , "0"], "100");
    await ratesProvider.defineRates(["150"]);
    userRegistry = await UserRegistryMock.new("Test", CHF_BYTES, accounts, NEXT_YEAR);
    await userRegistry.updateUserAllExtended(1, ["5", "50000", "50000"]);
    await userRegistry.updateUserAllExtended(2, ["5", "50000", "50000"]);
    await userRegistry.updateUserAllExtended(3, ["5", "50000", "50000"]);

    await delegate.defineAuditConfiguration(1,
      0, true, // scopes
      AUDIT_TRIGGERS_ONLY, AUDIT_STORAGE_USER_ID,
      [1], [2], ratesProvider.address, CHF_BYTES,
      [false, false, true, true] // fields
   );
  });

  it("should test", async function () {

  });
});
