"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const YesNoRule = artifacts.require("YesNoRule.sol");

contract("YesNoRule", function (accounts) {
  let rule;

  describe("With a Yes Rule", function () {
    beforeEach(async function () {
      rule = await YesNoRule.new(true);
    });

    it("should be a yes rule", async function () {
      const yesNo = await rule.yesNo();
      assert.ok(yesNo, "yes");
    });

    it("should have address valid", async function () {
      const isAddressValid = await rule.isAddressValid(accounts[0]);
      assert.ok(isAddressValid, "address valid");
    });

    it("should have transfer valid", async function () {
      const isTransferValid =
        await rule.isTransferValid(accounts[0], accounts[1], 1000);
      assert.ok(isTransferValid, "transfer valid");
    });
  });

  describe("With a No Rule", function () {
    beforeEach(async function () {
      rule = await YesNoRule.new(false);
    });

    it("should be a no rule", async function () {
      const yesNo = await rule.yesNo();
      assert.ok(!yesNo, "yes");
    });

    it("should have address invalid", async function () {
      const isAddressValid = await rule.isAddressValid(accounts[0]);
      assert.ok(!isAddressValid, "address invalid");
    });

    it("should have transfer invalid", async function () {
      const isTransferValid =
        await rule.isTransferValid(accounts[0], accounts[1], 1000);
      assert.ok(!isTransferValid, "transfer invalid");
    });
  });
});
