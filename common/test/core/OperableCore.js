'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const OperableProxyMock = artifacts.require('OperableProxyMock.sol');
const OperableCoreMock = artifacts.require('OperableCoreMock.sol');

contract('OperableCore', function (accounts) {
  let proxy, core;
  const owner = accounts[0];
  const sysOperator = accounts[1];
  const nonOperator = accounts[2];

  const ALL_PRIVILEGES = web3.utils.fromAscii('AllPrivileges').padEnd(66, '0');
  const UNSECURE_ROLE = web3.utils.fromAscii('Unsecure').padEnd(66, '0');
  const NO_ROLE = '0x'.padEnd(66, '0');
  const RESTRICTED_ROLE = '0x'.padEnd(66, 'f');
  const ALL_PROXIES = web3.utils.toChecksumAddress(
    '0x' + web3.utils.fromAscii('AllProxies').substr(2).padStart(40, '0'));
  const FAKE_ADDRESS = '0x'.padEnd(42, 'f');

  beforeEach(async function () {
    core = await OperableCoreMock.new([ sysOperator ]);
    proxy = await OperableProxyMock.new(core.address);
  });

  it('should have a core for proxy', async function () {
    const coreAddress = await proxy.core();
    assert.equal(coreAddress, core.address, 'core');
  });

  it('should have a owner for core', async function () {
    const coreOwner = await core.owner();
    assert.equal(coreOwner, owner, 'owner');
  });

  it('should have a core with allPrivileges defined', async function () {
    const allPrivs = await core.allPrivileges();
    assert.equal(allPrivs, ALL_PRIVILEGES, 'all privileges');
  });

  it('should have a core with allProxies defined', async function () {
    const allProxies = await core.allProxies();
    assert.equal(allProxies, ALL_PROXIES, 'all proxies');
  });

  it('should have no privileges role for owner', async function () {
    const role = await core.coreRole(owner);
    assert.equal(role, NO_ROLE, 'no role');
  });

  it('should have all privileges role for sysOperator', async function () {
    const role = await core.coreRole(sysOperator);
    assert.equal(role, ALL_PRIVILEGES, 'all privileges role');
  });

  it('should have no role for non sysOperator', async function () {
    const role = await core.coreRole(nonOperator);
    assert.equal(role, NO_ROLE, 'no role');
  });

  it('should have no privileges for owner', async function () {
    const allPrivs = await core.hasCorePrivilege(owner, '0xaaaabbbb');
    assert.ok(!allPrivs, 'privileges');
  });

  it('should have no privileges on all proxies for owner', async function () {
    const role = await core.proxyRole(ALL_PROXIES, owner);
    assert.equal(role, NO_ROLE, 'no role');
  });

  it('should have all privileges on all proxies role for sysOperator', async function () {
    const role = await core.proxyRole(ALL_PROXIES, sysOperator);
    assert.equal(role, ALL_PRIVILEGES, 'all privileges role');
  });

  it('should have no privileges on all proxies for nonOperator', async function () {
    const role = await core.proxyRole(ALL_PROXIES, nonOperator);
    assert.equal(role, NO_ROLE, 'no role');
  });

  it('should have no proxies privileges for owner', async function () {
    const allProxies = await core.hasProxyPrivilege(owner, ALL_PROXIES, '0xaaaabbbb');
    assert.ok(!allProxies, 'all proxies privileges');

    const anyProxies = await core.hasProxyPrivilege(owner, FAKE_ADDRESS, '0xaaaabbbb');
    assert.ok(!anyProxies, 'any proxies privileges');
  });

  it('should have all proxies privileges for sysOperator', async function () {
    const allProxies = await core.hasProxyPrivilege(sysOperator, ALL_PROXIES, '0xaaaabbbb');
    assert.ok(allProxies, 'all proxies privileges');

    const anyProxies = await core.hasProxyPrivilege(sysOperator, FAKE_ADDRESS, '0xaaaabbbb');
    assert.ok(anyProxies, 'any proxies privileges');
  });

  it('should have no proxies privileges for non operator', async function () {
    const allProxies = await core.hasProxyPrivilege(nonOperator, ALL_PROXIES, '0xaaaabbbb');
    assert.ok(!allProxies, 'all proxies privileges');

    const anyProxies = await core.hasProxyPrivilege(nonOperator, FAKE_ADDRESS, '0xaaaabbbb');
    assert.ok(!anyProxies, 'any proxies privileges');
  });

  it('should have no proxy role for owner', async function () {
    const role = await core.proxyRole(proxy.address, owner);
    assert.equal(role, NO_ROLE, 'privileges');
  });

  it('should have no privileges on an undefined role', async function () {
    const corePrivilege1 = await core.rolePrivilege(RESTRICTED_ROLE, '0xaaaabbbb');
    assert.ok(!corePrivilege1, 'no core privilege ABCDEF');
    const corePrivilege2 = await core.rolePrivilege(RESTRICTED_ROLE, '0x11112222');
    assert.ok(!corePrivilege2, 'no core privilege 123456');
  });

  it('should have AllPrivileges role with all core privileges', async function () {
    const corePrivilege1 = await core.roleHasPrivilege(ALL_PRIVILEGES, '0xaaaabbbb');
    assert.ok(corePrivilege1, 'core privilege ABCDEF');
    const corePrivilege2 = await core.roleHasPrivilege(ALL_PRIVILEGES, '0x11112222');
    assert.ok(corePrivilege2, 'core privilege 123456');
  });

  it('should let operator add a new role', async function () {
    const tx = await core.defineRole(UNSECURE_ROLE, ['0xaaaabbbb', '0x11112222']);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'RoleDefined', 'event');
    assert.equal(tx.logs[0].args.role, UNSECURE_ROLE, 'role');
  });

  it('should prevent non operator to define a new role', async function () {
    await assertRevert(core.defineRole(UNSECURE_ROLE, ['0xaaaabbbb', '0x11112222'], { from: nonOperator }), 'OC01');
  });

  it('should prevent redefining AllPrivileges', async function () {
    await assertRevert(core.defineRole(ALL_PRIVILEGES, ['0xaaaabbbb', '0x11112222']), 'OC04');
  });

  it('should let operator add core operators', async function () {
    const tx = await core.assignOperators(ALL_PRIVILEGES, [accounts[2], accounts[3]]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'OperatorAssigned', 'event');
    assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, 'role');
    assert.equal(tx.logs[0].args.operator, accounts[2], 'accounts[2]');
    assert.equal(tx.logs[1].event, 'OperatorAssigned', 'event');
    assert.equal(tx.logs[1].args.role, ALL_PRIVILEGES, 'role');
    assert.equal(tx.logs[1].args.operator, accounts[3], 'accounts[3]');
  });

  it('should prevent non operator to assign core operators', async function () {
    await assertRevert(
      core.assignOperators(ALL_PRIVILEGES, [accounts[1], accounts[2]], { from: nonOperator }), 'OC01');
  });

  it('should let operator add proxy operators', async function () {
    const tx = await core.assignProxyOperators(
      proxy.address, ALL_PRIVILEGES, [accounts[2], accounts[3]]);
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'ProxyOperatorAssigned', 'event');
    assert.equal(tx.logs[0].args.proxy, proxy.address, 'proxy');
    assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, 'role');
    assert.equal(tx.logs[0].args.operator, accounts[2], 'accounts[1]');
    assert.equal(tx.logs[1].event, 'ProxyOperatorAssigned', 'event');
    assert.equal(tx.logs[1].args.proxy, proxy.address, 'proxy');
    assert.equal(tx.logs[1].args.role, ALL_PRIVILEGES, 'role');
    assert.equal(tx.logs[1].args.operator, accounts[3], 'accounts[1]');
  });

  it('should prevent non operator to assign proxy operators', async function () {
    await assertRevert(
      core.assignProxyOperators(
        proxy.address, ALL_PRIVILEGES, [accounts[2], accounts[3]], { from: nonOperator }), 'OC01');
  });

  it('should let proxy operator to operate proxy', async function () {
    const tx = await proxy.setSuccess({ from: sysOperator });
    assert.ok(tx.receipt.status, 'Status');
  });

  it('should prevent non proxy operator to operate proxy', async function () {
    await assertRevert(proxy.setSuccess({ from: nonOperator }), 'OP01');
  });

  describe('with two roles and 3 accounts setup', function () {
    const ROLE_OP_ASSIGNER = web3.utils.fromAscii('OperatorAssigner').padEnd(66, '0');
    const ROLE_DESIGNER = web3.utils.fromAscii('RoleDesigner').padEnd(66, '0');
    const ROLE_NEW = web3.utils.fromAscii('NewRole').padEnd(66, '0');

    const roleAssignerOnly = accounts[3];
    const roleDesignerOnly = accounts[4];
    const bothRoles = accounts[5];
    const anyUser = accounts[6];

    beforeEach(async function () {
      await core.defineRole(ROLE_OP_ASSIGNER, [
        web3.utils.sha3('assignOperators(bytes32,address[])').substr(0, 10),
        web3.utils.sha3('revokeOperators(address[])').substr(0, 10)]);
      await core.defineRole(ROLE_DESIGNER, [
        web3.utils.sha3('defineRole(bytes32,bytes4[])').substr(0, 10),
      ]);
      await core.assignOperators(ROLE_OP_ASSIGNER, [roleAssignerOnly, bothRoles]);
      await core.assignOperators(ROLE_DESIGNER, [roleDesignerOnly, bothRoles]);
    });

    it('should have role with privileges', async function () {
      const rolePriv1 = await core.rolePrivilege(ROLE_OP_ASSIGNER,
        web3.utils.sha3('assignOperators(bytes32,address[])').substr(0, 10));
      assert.ok(rolePriv1, 'assignOperators with ROLE_OP_ASSIGNER');

      const rolePriv2 = await core.rolePrivilege(ROLE_DESIGNER,
        web3.utils.sha3('defineRole(bytes32,bytes4[])').substr(0, 10));
      assert.ok(rolePriv2, 'defineRole for ROLE_DESIGNER');
    });

    it('should let "OpAssigner 1" to add core operators', async function () {
      const tx = await core.assignOperators(
        ALL_PRIVILEGES, [anyUser], { from: roleAssignerOnly });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'OperatorAssigned', 'event');
      assert.equal(tx.logs[0].args.role, ALL_PRIVILEGES, 'role');
      assert.equal(tx.logs[0].args.operator, anyUser, 'any user');
    });

    it('should let "OpAssigner 1" to revoke operators', async function () {
      const tx = await core.revokeOperators([roleAssignerOnly], { from: roleAssignerOnly });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'OperatorRevoked', 'event');
      assert.equal(tx.logs[0].args.operator, roleAssignerOnly, 'operator removed');
    });

    it('should prevent non authorized to assign operators', async function () {
      await assertRevert(core.assignOperators(ALL_PRIVILEGES, [anyUser], { from: anyUser }), 'OC01');
    });

    it('should prevent non authorized to revoke operators', async function () {
      await assertRevert(core.revokeOperators([roleAssignerOnly], { from: roleDesignerOnly }), 'OC01');
    });

    it('should let "RoleDesigner 1" to define new role', async function () {
      const tx = await core.defineRole(ROLE_NEW, ['0xe68fdc5f'], { from: roleDesignerOnly });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'RoleDefined', 'event');
      assert.equal(tx.logs[0].args.role, ROLE_NEW, 'role');
    });

    it('should let "RoleDesigner 2" to define new role', async function () {
      const tx = await core.defineRole(ROLE_NEW, ['0xe68fdc5f'], { from: bothRoles });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'RoleDefined', 'event');
      assert.equal(tx.logs[0].args.role, ROLE_NEW, 'role');
    });

    it('should prevent non authorized to define role', async function () {
      await assertRevert(core.defineRole(ROLE_NEW, ['0xe68fdc5f'], { from: roleAssignerOnly }), 'OC01');
    });

    describe('And OpAssigner 2 revoked', function () {
      beforeEach(async function () {
        await core.revokeOperators([bothRoles], { from: roleAssignerOnly });
      });

      it('should prevent former "OpAssigner 2" to add core operators', async function () {
        await assertRevert(core.assignOperators(
          ALL_PRIVILEGES, [anyUser], { from: bothRoles }), 'OC01');
      });

      it('should prevent former "OpAssigner 2" to revoke core operators', async function () {
        await assertRevert(core.revokeOperators([sysOperator],
          { from: bothRoles }), 'OC01');
      });
    });
  });

  describe('wite a proxy and a delegate defined', function () {
    let proxy;

    beforeEach(async function () {
      proxy = await OperableProxyMock.new(core.address);
      await core.defineDelegate(1, core.address);
    });

    it('should let sys operator define a proxy', async function () {
      const tx = await core.defineProxy(proxy.address, 1, { from: sysOperator });
      assert.ok(tx.receipt.status, 'Status');
    });

    it('should prevent defining a proxy with ALL_PROXIES address', async function () {
      await assertRevert(core.defineProxy(ALL_PROXIES, 1, { from: sysOperator }), 'OC05');
    });
  });

  describe('With two proxies defined and 4 accounts setup', function () {
    let proxy1, proxy2;

    beforeEach(async function () {
      proxy1 = await OperableProxyMock.new(core.address);
      proxy2 = await OperableProxyMock.new(core.address);

      // core operator with no proxy access
      await core.assignOperators(ALL_PRIVILEGES, [accounts[2]]);

      // proxy1 operator
      await core.assignProxyOperators(proxy1.address, ALL_PRIVILEGES, [accounts[3]]);

      // proxy2 operator
      await core.assignProxyOperators(proxy2.address, ALL_PRIVILEGES, [accounts[4]]);

      // restricted proxy operator
      await core.assignProxyOperators(ALL_PROXIES, ALL_PRIVILEGES, [accounts[5]]);
      await core.assignProxyOperators(proxy1.address, RESTRICTED_ROLE, [accounts[5]]);
    });

    it('should have core operator', async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[2], '0xaaaabbbb');
      assert.ok(corePrivs, 'all core privileges');

      const allProxies = await core.hasProxyPrivilege(accounts[2], ALL_PROXIES, '0xaaaabbbb');
      assert.ok(!allProxies, 'all proxies privileges');

      const anyProxies = await core.hasProxyPrivilege(accounts[2], FAKE_ADDRESS, '0xaaaabbbb');
      assert.ok(!anyProxies, 'any proxies privileges');
    });

    it('should have proxy1 operator', async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[3], '0xaaaabbbb');
      assert.ok(!corePrivs, 'all core privileges');

      const allProxies = await core.hasProxyPrivilege(accounts[3], ALL_PROXIES, '0xaaaabbbb');
      assert.ok(!allProxies, 'all proxies privileges');

      const proxy1Privs = await core.hasProxyPrivilege(accounts[3], proxy1.address, '0xaaaabbbb');
      assert.ok(proxy1Privs, 'proxy1 privileges');
    });

    it('should have proxy2 operator', async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[4], '0xaaaabbbb');
      assert.ok(!corePrivs, 'all core privileges');

      const allProxies = await core.hasProxyPrivilege(accounts[4], ALL_PROXIES, '0xaaaabbbb');
      assert.ok(!allProxies, 'all proxies privileges');

      const proxy2Privs = await core.hasProxyPrivilege(accounts[4], proxy2.address, '0xaaaabbbb');
      assert.ok(proxy2Privs, 'proxy2 privileges');
    });

    it('should have restricted proxy operator', async function () {
      const corePrivs = await core.hasCorePrivilege(accounts[5], '0xaaaabbbb');
      assert.ok(!corePrivs, 'all core privileges');

      const allProxies = await core.hasProxyPrivilege(accounts[5], ALL_PROXIES, '0xaaaabbbb');
      assert.ok(allProxies, 'all proxies privileges');

      const proxy1Privs = await core.hasProxyPrivilege(accounts[5], proxy1.address, '0xaaaabbbb');
      assert.ok(!proxy1Privs, 'no proxy1 privs');
      const proxy2Privs = await core.hasProxyPrivilege(accounts[5], proxy2.address, '0xaaaabbbb');
      assert.ok(proxy2Privs, 'proxy2 privileges');
    });

    it('should let core operator to operate core', async function () {
      const tx = await core.successAsCoreOp(proxy1.address, { from: accounts[2] });
      assert.ok(tx.receipt.status, 'Status');
    });

    it('should prevent proxy1 operator to operate core', async function () {
      await assertRevert(core.successAsCoreOp(proxy1.address, { from: accounts[3] }), 'OC02');
    });

    it('should prevent core operator to operate proxy1 and proxy2', async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[2] }), 'OC03');
      await assertRevert(core.successAsProxyOp(proxy2.address, { from: accounts[2] }), 'OC03');
    });

    it('should let proxy1 operator to operate proxy1 but not proxy2', async function () {
      const tx1 = await core.successAsProxyOp(proxy1.address, { from: accounts[3] });
      assert.ok(tx1.receipt.status, 'Status proxy1');
      await assertRevert(core.successAsProxyOp(proxy2.address, { from: accounts[3] }), 'OC03');
    });

    it('should let proxy2 operator to operate proxy2 but not proxy1', async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[4] }), 'OC03');
      const tx2 = await core.successAsProxyOp(proxy2.address, { from: accounts[4] });
      assert.ok(tx2.receipt.status, 'Status proxy2');
    });

    it('should let core but restricted for proxy1 operator to operate proxy2 but not proxy1', async function () {
      await assertRevert(core.successAsProxyOp(proxy1.address, { from: accounts[5] }), 'OC03');
      const tx2 = await core.successAsProxyOp(proxy2.address, { from: accounts[5] });
      assert.ok(tx2.receipt.status, 'Status proxy2');
    });
  });
});
