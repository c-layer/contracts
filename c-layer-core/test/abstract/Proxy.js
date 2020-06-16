"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const ProxyMock = artifacts.require("ProxyMock.sol");

contract("Proxy", function (accounts) {
  let core, proxy;

  beforeEach(async function () {
    core = accounts[0];
    proxy = await ProxyMock.new(core);
  });

  it("should let the core to success only core", async function () {
    const success = await proxy.successOnlyCore(true);
    assert.ok(success, "success");
  });

  it("should prevent non core to success only core", async function () {
    await assertRevert(proxy.successOnlyCore(true, { from: accounts[1] }), "PR01");
  });
});
