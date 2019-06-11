"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
var OperableMock = artifacts.require("mock/OperableMock.sol");

contract("Operable", function (accounts) {
  let operable;

  beforeEach(async function () {
    operable = await OperableMock.new();
  });

  it("should allow owner as operator through onlyOperator modifier", async function () {
    await operable.testOnlyOperator();
  });

  it("should not allow non operator through onlyOperator modifier", async function () {
    await assertRevert(operable.testOnlyOperator({ from: accounts[1] }), "OP01");
  });

  it("should returns owner is operator", async function() {
    const isOperator = await operable.isOperator(accounts[0]);
    assert.ok(isOperator, "isOperator");
  });

  it("should returns non owner is not operator", async function() {
    const isOperator = await operable.isOperator(accounts[1]);
    assert.ok(!isOperator, "isOperator");
  });

  it("should allow owner to remove an operator", async function () {
    const tx = await operable.removeOperator(accounts[0]);
    assert.ok(tx.receipt.status, "status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "OperatorRemoved");
    assert.equal(tx.logs[0].args.address_, accounts[0]);
  });

  it("should allow owner to set a new operator", async function () {
    const tx = await operable.defineOperator("OPERATOR", accounts[1]);
    assert.ok(tx.receipt.status, "status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "OperatorDefined");
    assert.equal(tx.logs[0].args.role, "OPERATOR");
    assert.equal(tx.logs[0].args.address_, accounts[1]);
  });

  it("should not allow owner to remove non existing operator", async function () {
    await assertRevert(operable.removeOperator(accounts[2]), "OP02");
  });

  it("should not allow non owner to set a new operator", async function () {
    await assertRevert(operable.defineOperator("OPERATOR" , accounts[2], { from: accounts[4] }));
  });

  it("should not allow owner to define twice the same operator", async function () {
    await assertRevert(operable.defineOperator("OPERATOR" , accounts[0]), "OP03");
  });

  describe("with another operator defined", function () {
    beforeEach(async function () {
      await operable.defineOperator("OPERATOR", accounts[1]);
    });

    it("should allow non owner operator through onlyOperator modifier", async function () {
      await operable.testOnlyOperator({ from: accounts[1] });
    });

    it("should not allow non operator through onlyOperator modifier", async function () {
      await assertRevert(operable.testOnlyOperator({ from: accounts[2] }), "OP01");
    });

    it("should returns owner is operator", async function() {
      const isOperator = await operable.isOperator(accounts[0]);
      assert.ok(isOperator, "isOperator");
    });

    it("should returns new operator is now operator", async function() {
      const isOperator = await operable.isOperator(accounts[1]);
      assert.ok(isOperator, "isOperator");
    });

    it("should not allow non owner operator to remove a new operator", async function () {
      await assertRevert(operable.removeOperator(accounts[2], { from: accounts[1] }));
    });

    it("should not allow non owner operator to define a new operator", async function () {
      await assertRevert(operable.defineOperator("OPERATOR" , accounts[2], { from: accounts[1] }));
    });
  });
});
