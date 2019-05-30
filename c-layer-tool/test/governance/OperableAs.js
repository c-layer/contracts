"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */

const assertRevert = require("../helpers/assertRevert");
var Operable = artifacts.require("governance/Operable.sol");
var OperableAsMock = artifacts.require("mock/OperableAsMock.sol");

contract("OperableAs", function (accounts) {
  let operable;
  let operableAs;

  beforeEach(async function () {
    operable = await Operable.new();
    operableAs = await OperableAsMock.new(operable.address);
  });

  it("should allow owner as operator through onlyOperator modifier", async function () {
    await operableAs.testOnlyOperator();
  });

  it("should not allow non operator through onlyOperator modifier", async function () {
    await assertRevert(operableAs.testOnlyOperator({ from: accounts[1] }), "OP01");
  });

  describe("with another operator defined", function () {
    beforeEach(async function () {
      await operable.defineOperator("OPERATOR", accounts[1]);
    });

    it("should allow non owner operator through onlyOperator modifier", async function () {
      await operableAs.testOnlyOperator({ from: accounts[1] });
    });

    it("should not allow non operator through onlyOperator modifier", async function () {
      await assertRevert(operableAs.testOnlyOperator({ from: accounts[2] }), "OP01");
    });
  });
});
