"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const OperableAsCoreMock = artifacts.require("OperableAsCoreMock.sol");
const OperableCoreMock = artifacts.require("OperableCoreMock.sol");

contract("Proxy", function (accounts) {
  let contract, core, proxy;

  beforeEach(async function () {
    contract = await OperableAsCoreMock.new();
    core = await OperableCoreMock.new([ accounts[1] ]);
  });

  it("should let core operator access", async function () {
    const success = await contract.testOnlyCoreOperator(
      core.address, { from: accounts[1] });
    assert.ok(success, "success");
  });

  it("shouldd prevent non core operator access", async function () {
    await assertRevert(contract.testOnlyCoreOperator(
      core.address, { from: accounts[2] }));
  });

  it("should let proxy operator access", async function () {
    const success = await contract.testOnlyProxyOperator(
      core.address, contract.address, { from: accounts[1] });
    assert.ok(success, "success");
  });

  it("should prevent non proxy operator access", async function () {
    await assertRevert(contract.testOnlyProxyOperator(
      core.address, contract.address, { from: accounts[2] }));
  });
});
