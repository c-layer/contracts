"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const OperableProxyMock = artifacts.require("OperableProxyMock.sol");
const OperableCoreMock = artifacts.require("OperableCoreMock.sol");

contract("Operable", function (accounts) {
  let proxy, core;

  const ALL_PRIVILEGES = web3.utils.fromAscii("AllPrivileges").padEnd(66, "0");
  const UNSECURE_ROLE = web3.utils.fromAscii("Unsecure").padEnd(66, "0");
  const NO_ROLE = "0x".padEnd(66, "0");
  const RESTRICTED_ROLE = "0x".padEnd(66, "f");
  const ALL_PROXIES_ADDRESS = web3.utils.toChecksumAddress(
    "0x" + web3.utils.fromAscii("AllProxies").substr(2).padStart(40, "0"));
  const FAKE_ADDRESS = "0x".padEnd(42, "f");

  beforeEach(async function () {
    core = await OperableCoreMock.new();
    proxy = await OperableProxyMock.new(core.address);
  });

  it("should have a core for proxy", async function () {
    const coreAddress = await proxy.core();
    assert.equal(coreAddress, core.address, "core");
  });

  it("should have a owner for core", async function () {
    const owner = await core.owner();
    assert.equal(owner, accounts[0], "owner");
  });

  it("should have a owner for proxy", async function () {
    const owner = await proxy.owner();
    assert.equal(owner, accounts[0], "owner");
  });

  it("should have a core with allPrivileges defined", async function () {
    const allPrivs = await core.allPrivileges();
    assert.equal(allPrivs, ALL_PRIVILEGES, "all privileges");
  });

  it("should have a core with allProxies defined", async function () {
    const allProxies = await core.allProxies();
    assert.equal(allProxies, ALL_PROXIES_ADDRESS, "all proxies");
  });

  it("should have all privileges role for owner", async function () {
    const role = await core.coreRole(accounts[0]);
    assert.equal(role, ALL_PRIVILEGES, "privileges");
  });

  it("should have all privileges for owner", async function () {
    const allPrivs = await core.hasCorePrivilege(accounts[0], "0xaaaabbbb");
    assert.ok(allPrivs, "privileges");
  });

  it("should have all proxies privileges role for owner", async function () {
    const role = await core.proxyRole(ALL_PROXIES_ADDRESS, accounts[0]);
    assert.equal(role, ALL_PRIVILEGES, "privileges");
  });

  it("should have all proxies privileges for owner", async function () {
    const allProxies = await core.hasProxyPrivilege(accounts[0], ALL_PROXIES_ADDRESS, "0xaaaabbbb");
    assert.ok(allProxies, "all proxies privileges");

    const anyProxies = await core.hasProxyPrivilege(accounts[0], FAKE_ADDRESS, "0xaaaabbbb");
    assert.ok(anyProxies, "any proxies privileges");
  });

  it("should have no proxy role for owner", async function () {
    const role = await core.proxyRole(proxy.address, accounts[0]);
    assert.equal(role, NO_ROLE, "privileges");
  });

  it("should have AllPrivileges role with all core privileges", async function () {
    const corePrivilege1 = await core.roleHasPrivilege(ALL_PRIVILEGES, "0xaaaabbbb");
    assert.ok(corePrivilege1, "core privilege ABCDEF");
    const corePrivilege2 = await core.roleHasPrivilege(ALL_PRIVILEGES, "0x11112222");
    assert.ok(corePrivilege2, "core privilege 123456");
  });

  it("should let owner add a new role", async function () {
    const tx = await core.defineRole(UNSECURE_ROLE, [ "0xaaaabbbb", "0x11112222" ]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "RoleDefined", "event");
    assert.equal(tx.logs[0].args.role, UNSECURE_ROLE, "role");
  });

  it("should prevent non owner to define a new role", async function () {
    await assertRevert(core.defineRole(UNSECURE_ROLE, [ "0xaaaabbbb", "0x11112222" ], { from: accounts[1] }), "OC01");
  });

  it("should prevent owner to redefine AllPrivileges", async function () {
    await assertRevert(core.defineRole(ALL_PRIVILEGES, [ "0xaaaabbbb", "0x11112222" ]), "OC04");
  });

  it("should let owner add core operators", async function () {
    const tx = await core.assignOperators(ALL_PRIVILEGES, [ accounts[1], accounts[2] ]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, "OperatorAssigned", "event");
    assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, "role");
    assert.equal(tx.logs[0].args.operator, accounts[1], "accounts[1]");
    assert.equal(tx.logs[1].event, "OperatorAssigned", "event");
    assert.equal(tx.logs[1].args.role, ALL_PRIVILEGES, "role");
    assert.equal(tx.logs[1].args.operator, accounts[2], "accounts[1]");
  });

  it("should prevent non owner to assign core operators", async function () {
    await assertRevert(
      core.assignOperators(ALL_PRIVILEGES, [ accounts[1], accounts[2] ], { from: accounts[1] }), "OC01");
  });

  it("should let owner add proxy operators", async function () {
    const tx = await core.assignProxyOperators(
      proxy.address, ALL_PRIVILEGES, [ accounts[1], accounts[2] ]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, "ProxyOperatorAssigned", "event");
    assert.equal(tx.logs[0].args.proxy, proxy.address, "proxy");
    assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, "role");
    assert.equal(tx.logs[0].args.operator, accounts[1], "accounts[1]");
    assert.equal(tx.logs[1].event, "ProxyOperatorAssigned", "event");
    assert.equal(tx.logs[1].args.proxy, proxy.address, "proxy");
    assert.equal(tx.logs[1].args.role, ALL_PRIVILEGES, "role");
    assert.equal(tx.logs[1].args.operator, accounts[2], "accounts[1]");
  });

  it("should prevent non owner to assign proxy operators", async function () {
    await assertRevert(
      core.assignProxyOperators(
        proxy.address, ALL_PRIVILEGES, [ accounts[1], accounts[2] ], { from: accounts[1] }), "OC01");
  });

  it("should let proxy operator to operate proxy", async function () {
    const tx = await proxy.success();
    assert.ok(tx.receipt.status, "Status");
  });

  it("should prevent non proxy operator to operate proxy", async function () {
    await assertRevert(proxy.success({ from: accounts[1] }), "OP01");
  });

  describe("with two roles and 3 accounts setup", function () {
    const ROLE_OP_ASSIGNER = web3.utils.fromAscii("OperatorAssigner").padEnd(66, "0");
    const ROLE_DESIGNER = web3.utils.fromAscii("RoleDesigner").padEnd(66, "0");
    const ROLE_NEW = web3.utils.fromAscii("NewRole").padEnd(66, "0");

    beforeEach(async function () {
      await core.defineRole(ROLE_OP_ASSIGNER, [
        web3.utils.sha3("assignOperators(bytes32,address[])").substr(0, 10),
        web3.utils.sha3("revokeOperators(address[])").substr(0, 10) ]);
      await core.defineRole(ROLE_DESIGNER, [
        web3.utils.sha3("defineRole(bytes32,bytes4[])").substr(0, 10),
      ]);
      await core.assignOperators(ROLE_OP_ASSIGNER, [ accounts[1], accounts[2] ]);
      await core.assignOperators(ROLE_DESIGNER, [ accounts[2], accounts[3] ]);
    });

    it("should let 'OpAssigner 1' to add core operators", async function () {
      const tx = await core.assignOperators(
        ALL_PRIVILEGES, [ accounts[4] ], { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "OperatorAssigned", "event");
      assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, "role");
      assert.equal(tx.logs[0].args.operator, accounts[4], "accounts[4]");
    });

    it("should let 'OpAssigner 1' to revoke operators", async function () {
      const tx = await core.revokeOperators([ accounts[1] ], { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "OperatorRevoked", "event");
      assert.equal(tx.logs[0].args.operator, accounts[1], "accounts[1]");
    });

    it("should prevent former 'OpAssigner 2' to add core operators", async function () {
      await assertRevert(core.assignOperators(
        ALL_PRIVILEGES, [ accounts[4] ], { from: accounts[1] }), "OC01");
    });

    it("should prevent non authorized to assign operators", async function () {
      await assertRevert(core.assignOperators(ALL_PRIVILEGES, [ accounts[4] ], { from: accounts[3] }), "OC01");
    });

    it("should prevent non authorized to revoke operators", async function () {
      await assertRevert(core.revokeOperators([ accounts[1] ], { from: accounts[3] }), "OC01");
    });

    it("should let 'RoleDesigner 1' to define new role", async function () {
      const tx = await core.defineRole(ROLE_NEW, [ "0xe68fdc5f" ], { from: accounts[2] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "RoleDefined", "event");
      assert.equal(tx.logs[0].args.role, ROLE_NEW, "role");
    });

    it("should let 'RoleDesigner 3' to define new role", async function () {
      const tx = await core.defineRole(ROLE_NEW, [ "0xe68fdc5f" ], { from: accounts[3] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "RoleDefined", "event");
      assert.equal(tx.logs[0].args.role, ROLE_NEW, "role");
    });

    it("should prevent non authorized to define role", async function () {
      await assertRevert(core.defineRole(ROLE_NEW, [ "0xe68fdc5f" ], { from: accounts[2] }), "OC01");
    });
  });

  describe("With two proxies defined and 4 accounts setup", function () {
    let proxy1, proxy2;

    beforeEach(async function () {
      proxy1 = await OperableProxyMock.new(core.address);
      proxy2 = await OperableProxyMock.new(core.address);

      // core operator
      await core.assignOperators(ALL_PRIVILEGES, [ accounts[1] ]);
 
      // proxy1 operator
      await core.assignProxyOperators(proxy1.address, ALL_PRIVILEGES, [ accounts[2] ]);

      // proxy2 operator
      await core.assignProxyOperators(proxy2.address, ALL_PRIVILEGES, [ accounts[3] ]);

      // restricted proxy operator
      await core.assignProxyOperators(ALL_PROXIES_ADDRESS, ALL_PRIVILEGES, [ accounts[4] ]);
      await core.assignProxyOperators(proxy1.address, RESTRICTED_ROLE, [ accounts[4] ]);
    });

    it("should have core operator", async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[1], "0xaaaabbbb");
      assert.ok(corePrivs, "all core privileges");

      const allProxies = await core.hasProxyPrivilege(accounts[1], ALL_PROXIES_ADDRESS, "0xaaaabbbb");
      assert.ok(!allProxies, "all proxies privileges");

      const anyProxies = await core.hasProxyPrivilege(accounts[1], FAKE_ADDRESS, "0xaaaabbbb");
      assert.ok(!anyProxies, "any proxies privileges");
    });

    it("should have proxy1 operator", async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[2], "0xaaaabbbb");
      assert.ok(!corePrivs, "all core privileges");

      const allProxies = await core.hasProxyPrivilege(accounts[2], ALL_PROXIES_ADDRESS, "0xaaaabbbb");
      assert.ok(!allProxies, "all proxies privileges");

      const proxy1Privs = await core.hasProxyPrivilege(accounts[2], proxy1.address, "0xaaaabbbb");
      assert.ok(proxy1Privs, "proxy1 privileges");
    });

    it("should have proxy2 operator", async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[3], "0xaaaabbbb");
      assert.ok(!corePrivs, "all core privileges");

      const allProxies = await core.hasProxyPrivilege(accounts[3], ALL_PROXIES_ADDRESS, "0xaaaabbbb");
      assert.ok(!allProxies, "all proxies privileges");

      const proxy2Privs = await core.hasProxyPrivilege(accounts[3], proxy2.address, "0xaaaabbbb");
      assert.ok(proxy2Privs, "proxy2 privileges");
    });

    it("should have restricted proxy operator", async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[4], "0xaaaabbbb");
      assert.ok(!corePrivs, "all core privileges");

      const allProxies = await core.hasProxyPrivilege(accounts[4], ALL_PROXIES_ADDRESS, "0xaaaabbbb");
      assert.ok(allProxies, "all proxies privileges");

      const proxy1Privs = await core.hasProxyPrivilege(accounts[4], proxy1.address, "0xaaaabbbb");
      assert.ok(!proxy1Privs, "no proxy1 privs");
      const proxy2Privs = await core.hasProxyPrivilege(accounts[4], proxy2.address, "0xaaaabbbb");
      assert.ok(proxy2Privs, "proxy2 privileges");
    });

    it("should let core operator to operate core", async function () {
      const tx = await core.successAsCoreOp(proxy1.address, { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
    });

    it("should prevent proxy1 operator to operate core", async function () {
      await assertRevert(core.successAsCoreOp(proxy1.address, { from: accounts[2] }), "OC02");
    });

    it("should prevent core operator to operate proxy1 and proxy2", async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[1] }), "OC03");
      await assertRevert(core.successAsProxyOp(proxy2.address, { from: accounts[1] }), "OC03");
    });

    it("should let proxy1 operator to operate proxy1 but not proxy2", async function () {
      const tx1 = await core.successAsProxyOp(proxy1.address, { from: accounts[2] });
      assert.ok(tx1.receipt.status, "Status proxy1");
      await assertRevert(core.successAsProxyOp(proxy2.address, { from: accounts[2] }), "OC03");
    });

    it("should let proxy2 operator to operate proxy2 but not proxy1", async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[3] }), "OC03");
      const tx2 = await core.successAsProxyOp(proxy2.address, { from: accounts[3] });
      assert.ok(tx2.receipt.status, "Status proxy2");
    });

    it("should let core but restricted for proxy1 operator to operate proxy2 but not proxy1", async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[4] }), "OC03");
      const tx2 = await core.successAsProxyOp(proxy2.address, { from: accounts[4] });
      assert.ok(tx2.receipt.status, "Status proxy2");
    });
  });
});
