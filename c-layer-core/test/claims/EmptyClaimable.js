"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const EmptyClaimable = artifacts.require("EmptyClaimable.sol");

contract("EmptyClaimable", function (accounts) {
  let claims;

  describe("With an EmptyClaimable active", function () {
    beforeEach(async function () {
      claims = await EmptyClaimable.new(true);
    });

    it("should be active", async function () {
      const active = await claims.active();
      assert.ok(active, "active");
    });

    it("should have claims since", async function () {
      const hasClaimsSince = await claims.hasClaimsSince(
        accounts[0],
        new Date().getTime());
      assert.ok(hasClaimsSince, "has claims");
    });
  });

  describe("With an EmptyClaimable inactive", function () {
    beforeEach(async function () {
      claims = await EmptyClaimable.new(false);
    });

    it("should not be active", async function () {
      const active = await claims.active();
      assert.ok(!active, "not active");
    });

    it("should have no claims since", async function () {
      const hasClaimsSince = await claims.hasClaimsSince(
        accounts[0],
        new Date().getTime());
      assert.ok(!hasClaimsSince, "has no claims");
    });
  });
});
