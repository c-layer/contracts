'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require('TokenProxy.sol');
const TokenCore = artifacts.require('TokenCore.sol');
const MintableTokenDelegate = artifacts.require('MintableTokenDelegate.sol');
const TokenDelegate = artifacts.require('TokenDelegate.sol');

const UserRegistryMock = artifacts.require('UserRegistryMock.sol');
const RatesProviderMock = artifacts.require('RatesProviderMock.sol');

const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = 18;
const TOTAL_SUPPLY = '1000000';
const CHF_BYTES = web3.utils.toHex('CHF').padEnd(66, '0');
const CHF_ADDRESS = web3.utils.toHex('CHF').padEnd(42, '0');
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);

const CORE_GAS_COST = 4126262;
const MINTABLE_DELEGATE_GAS_COST = 1663879;
const DELEGATE_GAS_COST = 2974905;
const PROXY_GAS_COST = 824865;

const MINTABLE_FIRST_TRANSFER_COST = 64346;
const MINTABLE_FIRST_TRANSFER_FROM_COST = 76234;
const MINTABLE_TRANSFER_COST = 48866;
const FIRST_TRANSFER_COST = 104862;
const FIRST_TRANSFER_FROM_COST = 116725;
const TRANSFER_COST = 73902;
const ISSUANCE_AUDITED_FIRST_TRANSFER_COST = 170071;
const ISSUANCE_AUDITED_FIRST_TRANSFER_FROM_COST = 181936;
const ISSUANCE_AUDITED_TRANSFER_COST = 97805;
const ISSUANCE_AUDITED_FIRST_TRANSFER_AFTER_COST = 103999;
const ISSUANCE_AUDITED_TRANSFER_AFTER_COST = 73038;
const AUDITED_FIRST_TRANSFER_COST = 104862;
const AUDITED_FIRST_TRANSFER_FROM_COST = 116725;
const AUDITED_TRANSFER_COST = 69567;
const AUDITED_FIRST_TRANSFER_AFTER_COST = 104862;
const AUDITED_TRANSFER_AFTER_COST = 69567;

const AUDIT_MODE_ALWAYS_TRIGGERS_EXCLUDED = 2;
const AUDIT_MODE_WHEN_TRIGGERS_MATCHED = 3;

contract('Performance [ @skip-on-coverage ]', function (accounts) {
  let userRegistry, ratesProvider;
  let core;

  before(async function () {
    ratesProvider = await RatesProviderMock.new('Test');
    userRegistry = await UserRegistryMock.new('Test', CHF_BYTES, accounts, NEXT_YEAR);
    await userRegistry.updateUserAllExtended(1, ['5', '50000', '50000']);
    await userRegistry.updateUserAllExtended(2, ['5', '50000', '50000']);
    await userRegistry.updateUserAllExtended(3, ['5', '50000', '50000']);
  });

  it('should have a core gas cost at ' + CORE_GAS_COST, async function () {
    const gas = await TokenCore.new.estimateGas('Test', [accounts[0]]);
    assert.equal(gas, CORE_GAS_COST, 'gas');
  });

  it('should have a mintable delegate gas cost at ' + MINTABLE_DELEGATE_GAS_COST, async function () {
    const gas = await MintableTokenDelegate.new.estimateGas();
    assert.equal(gas, MINTABLE_DELEGATE_GAS_COST, 'gas');
  });

  it('should have a mintable C delegate gas cost at ' + DELEGATE_GAS_COST, async function () {
    const gas = await TokenDelegate.new.estimateGas();
    assert.equal(gas, DELEGATE_GAS_COST, 'gas');
  });

  it('should have a proxy gas cost at ' + PROXY_GAS_COST, async function () {
    core = await TokenCore.new('Test', [accounts[0]]);
    const gas = await TokenProxy.new.estimateGas(core.address);
    assert.equal(gas, PROXY_GAS_COST, 'gas');
  });

  describe('With delegates defined', function () {
    let delegates, token;

    beforeEach(async function () {
      delegates = await Promise.all([
        MintableTokenDelegate.new(), TokenDelegate.new(),
      ]);
      core = await TokenCore.new('Test', [accounts[0]]);

      await core.defineTokenDelegate(1, delegates[0].address, []);
      await core.defineTokenDelegate(2, delegates[1].address, [2]);
      await core.defineOracle(userRegistry.address, ratesProvider.address, CHF_ADDRESS);
    });

    describe('With a mintable token defined', function () {
      beforeEach(async function () {
        token = await TokenProxy.new(core.address);
        await core.defineToken(
          token.address, 1, NAME, SYMBOL, DECIMALS);
        await core.mint(token.address, [accounts[0]], [TOTAL_SUPPLY]);
        await token.transfer(token.address, '3333');
        await token.approve(accounts[1], '3333');
      });

      it('should estimate a first transfer accounts[0]', async function () {
        const gas = await token.transfer.estimateGas(accounts[1], '3333');
        assert.equal(gas, MINTABLE_FIRST_TRANSFER_COST, 'estimate');
      });

      it('should estimate a first transfer from accounts[0]', async function () {
        const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], '3333', { from: accounts[1] });
        assert.equal(gas, MINTABLE_FIRST_TRANSFER_FROM_COST, 'estimate');
      });

      // Later transfer does not have to allocate extra memory and should be cheaper
      it('should estimate more transfer from accounts[0]', async function () {
        await token.transfer(accounts[1], '3333');
        const gas = await token.transfer.estimateGas(accounts[1], '3333');
        assert.equal(gas, MINTABLE_TRANSFER_COST, 'estimate');
      });
    });

    describe('With a c token defined', function () {
      beforeEach(async function () {
        token = await TokenProxy.new(core.address);
        await ratesProvider.defineCurrencies([CHF_BYTES, token.address],
          ['0', '0'], '100');
        await ratesProvider.defineRates(['150']);
        await core.defineToken(
          token.address, 2, NAME, SYMBOL, DECIMALS);
        await core.mint(token.address, [accounts[0]], [TOTAL_SUPPLY]);
        await token.approve(accounts[1], '3333');
      });

      it('should eval canTransfer Ok', async function () {
        const result = await token.canTransfer.call(accounts[0], accounts[1], 0);
        assert.equal(result, 1, 'canTransfer');
      });

      it('should estimate a first transfer accounts[0]', async function () {
        const gas = await token.transfer.estimateGas(accounts[1], '3333');
        assert.equal(gas, FIRST_TRANSFER_COST, 'estimate');
      });

      it('should estimate a first transfer from accounts[0]', async function () {
        const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], '3333', { from: accounts[1] });
        assert.equal(gas, FIRST_TRANSFER_FROM_COST, 'estimate');
      });

      // Later transfer does not have to allocate extra memory and should be cheaper
      it('should estimate more transfer from accounts[0]', async function () {
        await token.transfer(accounts[1], '3333');
        const gas = await token.transfer.estimateGas(accounts[1], '3333');
        assert.equal(gas, TRANSFER_COST, 'estimate');
      });

      describe('With primary aml audit configuration', function () {
        beforeEach(async function () {
          await core.defineTokenDelegate(2, delegates[1].address, [1]);
          await core.defineAuditConfiguration(1, 0,
            AUDIT_MODE_WHEN_TRIGGERS_MATCHED,
            [1], [2], ratesProvider.address, CHF_ADDRESS);
          await core.defineAuditTriggers(
            1, [accounts[0]], [false], [true], [false]);
        });

        it('should assert canTransfer', async function () {
          const reason = await token.canTransfer(accounts[0], accounts[1], '3333');
          assert.equal(reason.toString(), '1', 'should be transferable');
        });

        it('should estimate a first transfer accounts[0]', async function () {
          const gas = await token.transfer.estimateGas(accounts[1], '3333');
          assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_COST, 'estimate');
        });

        it('should estimate a first transfer from accounts[0]', async function () {
          const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], '3333', { from: accounts[1] });
          assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_FROM_COST, 'estimate');
        });

        // Later transfer does not have to allocate extra memory and should be cheaper
        it('should estimate more transfer from accounts[0]', async function () {
          await token.transfer(accounts[1], '3333');
          const gas = await token.transfer.estimateGas(accounts[1], '1111');
          assert.equal(gas, ISSUANCE_AUDITED_TRANSFER_COST, 'estimate');
        });

        describe('and after issuance', function () {
          beforeEach(async function () {
            await token.transfer(accounts[1], '3333');
          });

          it('should assert canTransfer', async function () {
            const reason = await token.canTransfer(accounts[1], accounts[2], '1111');
            assert.equal(reason.toString(), '1', 'should be transferable');
          });

          it('should estimate a first transfer by accounts[1] to acounts[2]', async function () {
            const gas = await token.transfer.estimateGas(accounts[2], '1111', { from: accounts[1] });
            assert.equal(gas, ISSUANCE_AUDITED_FIRST_TRANSFER_AFTER_COST, 'estimate');
          });

          it('should estimate more transfer by accounts[1] to acounts[2]', async function () {
            await token.transfer(accounts[2], '1111', { from: accounts[1] });
            const gas = await token.transfer.estimateGas(accounts[2], '1111', { from: accounts[1] });
            assert.equal(gas, ISSUANCE_AUDITED_TRANSFER_AFTER_COST, 'estimate');
          });
        });
      });

      describe('With secondary aml audit configuration', function () {
        beforeEach(async function () {
          await core.defineTokenDelegate(2, delegates[1].address, [2]);
          await core.defineAuditConfiguration(1, 0,
            AUDIT_MODE_ALWAYS_TRIGGERS_EXCLUDED,
            [1], [2], ratesProvider.address, CHF_ADDRESS);
          await core.defineAuditTriggers(
            1, [accounts[0]], [false], [true], [false]);
        });

        it('should assert canTransfer', async function () {
          const reason = await token.canTransfer(accounts[0], accounts[1], '3333');
          assert.equal(reason.toString(), '1', 'should be transferable');
        });

        it('should estimate a first transfer accounts[0]', async function () {
          const gas = await token.transfer.estimateGas(accounts[1], '3333');
          assert.equal(gas, AUDITED_FIRST_TRANSFER_COST, 'estimate');
        });

        it('should estimate a first transfer from accounts[0]', async function () {
          const gas = await token.transferFrom.estimateGas(accounts[0], accounts[2], '3333', { from: accounts[1] });
          assert.equal(gas, AUDITED_FIRST_TRANSFER_FROM_COST, 'estimate');
        });

        // Later transfer does not have to allocate extra memory and should be cheaper
        it('should estimate more transfer from accounts[0]', async function () {
          await token.transfer(accounts[1], '3333');
          const gas = await token.transfer.estimateGas(accounts[1], '3333');
          assert.equal(gas, AUDITED_TRANSFER_COST, 'estimate');
        });

        describe('and after issuance', function () {
          beforeEach(async function () {
            await token.transfer(accounts[1], '3333');
          });

          it('should assert canTransfer', async function () {
            const reason = await token.canTransfer(accounts[1], accounts[2], '1111');
            assert.equal(reason.toString(), '1', 'should be transferable');
          });

          it('should estimate a first transfer by accounts[1] to acounts[2]', async function () {
            const gas = await token.transfer.estimateGas(accounts[2], '1111', { from: accounts[1] });
            assert.equal(gas, AUDITED_FIRST_TRANSFER_AFTER_COST, 'estimate');
          });

          it('should estimate more transfer by accounts[1] to acounts[2]', async function () {
            await token.transfer(accounts[2], '1111', { from: accounts[1] });
            const gas = await token.transfer.estimateGas(accounts[2], '1111', { from: accounts[1] });
            assert.equal(gas, AUDITED_TRANSFER_AFTER_COST, 'estimate');
          });
        });
      });
    });
  });
});
