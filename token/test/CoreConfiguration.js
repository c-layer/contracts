'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('./helpers/assertRevert');
const MintableTokenDelegate = artifacts.require('MintableTokenDelegate.sol');
const TokenDelegate = artifacts.require('TokenDelegate.sol');
const TokenCore = artifacts.require('TokenCore.sol');
const CoreConfiguration = artifacts.require('CoreConfiguration.sol');
const UserRegistryMock = artifacts.require('UserRegistryMock.sol');
const RatesProviderMock = artifacts.require('RatesProviderMock.sol');

const CHF_ADDRESS = web3.utils.toHex('CHF').padEnd(42, '0');
const NULL_ADDRESS = '0x'.padEnd(42, '0');

const CORE_CONFIG_ROLE = web3.utils.fromAscii('CoreConfigRole').padEnd(66, '0');
const REQUIRED_CORE_PRIVILEGES = [
  web3.utils.sha3('defineCoreConfigurations(' +
    'address,address,address[],address,address,address,address,address)'),
  web3.utils.sha3('defineAuditConfiguration(' +
    'uint256,uint256,uint8,uint256[],uint256[],address,address)'),
  web3.utils.sha3('defineTokenDelegate(uint256,address,uint256[])'),
  web3.utils.sha3('defineRole(bytes32,bytes4[])'),
  web3.utils.sha3('assignOperators(bytes32,address[])'),
  web3.utils.sha3('revokeOperators(address[])'),
  web3.utils.sha3('assignProxyOperators(address,bytes32,address[])'),
  web3.utils.sha3('defineOracle(address,address,address)'),
].map((x) => x.substr(0, 10));
const COMPLIANCE_PROXY_ROLE = web3.utils.fromAscii('ComplianceProxyRole').padEnd(66, '0');
const COMPLIANCE_PROXY_PRIVILEGES = [
  web3.utils.sha3('defineRules(address,address[])'),
  web3.utils.sha3('defineLock(address,address,address,uint64,uint64)'),
  web3.utils.sha3('seize(address,address,uint256)'),
  web3.utils.sha3('freezeManyAddresses(address,address[],uint256)'),
].map((x) => x.substr(0, 10));
const ISSUER_PROXY_ROLE = web3.utils.fromAscii('IssuerProxyRole').padEnd(66, '0');
const ISSUER_PROXY_PRIVILEGES = [
  web3.utils.sha3('mint(address,address[],uint256[])'),
  web3.utils.sha3('burn(address,uint256)'),
  web3.utils.sha3('finishMinting(address)'),
  web3.utils.sha3('defineLock(address,address,address,uint64,uint64'),
  web3.utils.sha3('configureTokensales(address,address[],uint256[])'),
  web3.utils.sha3('updateAllowances(address,address[],uint256[])'),
].map((x) => x.substr(0, 10));

const AUDIT_BOTH = 4;
const AUDIT_NONE = 1;

contract('CoreConfiguration', function (accounts) {
  let mintableDelegate, compliantDelegate;
  let core, coreConfig;
  let userRegistry, ratesProvider;

  beforeEach(async function () {
    mintableDelegate = await MintableTokenDelegate.new();
    compliantDelegate = await TokenDelegate.new();
    core = await TokenCore.new('MyCore', [accounts[0]]);
    ratesProvider = await RatesProviderMock.new('Test');
    await ratesProvider.defineCurrencies([CHF_ADDRESS], ['0'], '100');
    userRegistry = await UserRegistryMock.new('Test', CHF_ADDRESS, accounts, '0');
  });

  it('should create a core configuration', async function () {
    coreConfig = await CoreConfiguration.new();
    assert.ok(coreConfig.address !== NULL_ADDRESS, 'coreConfig');
  });

  describe('With a core configuration', function () {
    beforeEach(async function () {
      coreConfig = await CoreConfiguration.new();
    });

    it('should not have core access', async function () {
      const access = await coreConfig.hasCoreAccess(core.address);
      assert.ok(!access, 'not access');
    });

    it('should prevent configuring core without access', async function () {
      await assertRevert(coreConfig.defineCoreConfigurations(
        core.address,
        [accounts[1]],
        mintableDelegate.address,
        compliantDelegate.address,
        userRegistry.address,
        ratesProvider.address,
        CHF_ADDRESS), 'CC01');
    });

    it('should have required core privileges', async function () {
      const requiredCorePrivileges =
        await Promise.all(REQUIRED_CORE_PRIVILEGES.map(
          (_, i) => coreConfig.requiredCorePrivileges(i)));
      assert.deepEqual(requiredCorePrivileges, REQUIRED_CORE_PRIVILEGES, 'core privileges');
      await assertRevert(coreConfig.requiredCorePrivileges(REQUIRED_CORE_PRIVILEGES.length));
    });

    describe('With privileges defined', function () {
      beforeEach(async function () {
        await core.defineRole(CORE_CONFIG_ROLE, REQUIRED_CORE_PRIVILEGES);
        await core.assignOperators(CORE_CONFIG_ROLE, [coreConfig.address]);
      });

      it('should have core access', async function () {
        const access = await coreConfig.hasCoreAccess(core.address);
        assert.ok(access, 'access');
      });

      it('should configure the core', async function () {
        const tx = await coreConfig.defineCoreConfigurations(
          core.address,
          [accounts[1]],
          mintableDelegate.address,
          compliantDelegate.address,
          userRegistry.address,
          ratesProvider.address,
          CHF_ADDRESS);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 0);
      });

      describe('With a core configured', function () {
        beforeEach(async function () {
          await coreConfig.defineCoreConfigurations(
            core.address,
            [accounts[1]],
            mintableDelegate.address,
            compliantDelegate.address,
            userRegistry.address,
            ratesProvider.address,
            CHF_ADDRESS);
        });

        it('should have an oracle defined', async function () {
          const u = await core.oracle();
          assert.equal(u.userRegistry, userRegistry.address, 'userRegistry');
          assert.equal(u.currency, CHF_ADDRESS, 'compliance currency');
        });

        it('should have audit configuration 1', async function () {
          const a = await core.auditConfiguration(1);
          assert.equal(a.scopeId.toString(), 0, 'scopeId');
          assert.equal(a.mode.toString(), AUDIT_BOTH, 'auditMode');
          assert.deepEqual(a.senderKeys.map((x) => x.toString()), [], 'sender keys');
          assert.deepEqual(a.receiverKeys.map((x) => x.toString()), ['1'], 'receiver keys');
          assert.equal(a.ratesProvider, ratesProvider.address, 'ratesProvider');
          assert.equal(a.currency, CHF_ADDRESS, 'currency');
        });

        it('should have audit configuration 2', async function () {
          const a = await core.auditConfiguration(2);
          assert.equal(a.scopeId.toString(), 0, 'scopeId');
          assert.equal(a.mode.toString(), AUDIT_NONE, 'auditMode');
          assert.deepEqual(a.senderKeys.map((x) => x.toString()), ['2'], 'sender keys');
          assert.deepEqual(a.receiverKeys.map((x) => x.toString()), ['1'], 'receiver keys');
          assert.equal(a.ratesProvider, ratesProvider.address, 'ratesProvider');
          assert.equal(a.currency, CHF_ADDRESS, 'currency');
        });

        it('should have 0+7 delegates correctly configured', async function () {
          const d0 = await core.delegate(0);
          assert.equal(d0, NULL_ADDRESS, 'no delegateId 0');
          const d1 = await core.delegate(1);
          assert.equal(d1, mintableDelegate.address, 'delegate 1');
          const d2 = await core.delegate(2);
          assert.equal(d2, mintableDelegate.address, 'delegate 2');
          const d3 = await core.delegate(3);
          assert.equal(d3, compliantDelegate.address, 'delegate 3');
          const d4 = await core.delegate(4);
          assert.equal(d4, compliantDelegate.address, 'delegate 4');
          const d5 = await core.delegate(5);
          assert.equal(d5, compliantDelegate.address, 'delegate 5');
          const d6 = await core.delegate(6);
          assert.equal(d6, compliantDelegate.address, 'delegate 6');
          const d7 = await core.delegate(7);
          assert.equal(d7, compliantDelegate.address, 'delegate 7');
        });

        it('should have define compliance proxy role with privileges', async function () {
          const result = await Promise.all(COMPLIANCE_PROXY_PRIVILEGES.map(
            (privilege) => core.rolePrivilege(COMPLIANCE_PROXY_ROLE, privilege)));
          assert.deepEqual(result, [true, true, true, true], 'compliance proxy privilege');
        });

        it('should have define issuer proxy role with privileges', async function () {
          const result = await Promise.all(ISSUER_PROXY_PRIVILEGES.map(
            (privilege) => core.rolePrivilege(ISSUER_PROXY_ROLE, privilege)));
          assert.deepEqual(result, [true, true, true, true, true, true], 'issuer proxy provilege');
        });
      });
    });
  });
});
