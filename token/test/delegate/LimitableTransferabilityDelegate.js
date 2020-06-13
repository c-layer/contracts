'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const LimitableTransferabilityDelegateMock =
  artifacts.require('LimitableTransferabilityDelegateMock.sol');

const UserRegistryMock = artifacts.require('UserRegistryMock.sol');
const RatesProviderMock = artifacts.require('RatesProviderMock.sol');

const SYMBOL = 'TKN';
const SYMBOL_BYTES = web3.utils.toHex(SYMBOL).padEnd(42, '0');
const CHF = 'CHF';
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(42, '0');
const NEXT_YEAR = Math.floor(new Date().getTime() / 1000) + (24 * 3600 * 365);

// Audit Mode
const AUDIT_TRIGGERS_ONLY = 3;

contract('LimitableTransferabilityDelegate', function (accounts) {
  let delegate, userRegistry, ratesProvider;

  beforeEach(async function () {
    delegate = await LimitableTransferabilityDelegateMock.new();
    ratesProvider = await RatesProviderMock.new('Test');
    await ratesProvider.defineCurrencies([CHF_BYTES, SYMBOL_BYTES], ['0', '0'], '100');
    await ratesProvider.defineRates(['150']);
    userRegistry = await UserRegistryMock.new('Test', CHF_BYTES, accounts, NEXT_YEAR);
    await userRegistry.updateUserAllExtended(1, ['5', '50000', '50000']);
    await userRegistry.updateUserAllExtended(2, ['5', '50000', '50000']);
    await userRegistry.updateUserAllExtended(3, ['5', '50000', '50000']);

    await delegate.defineAuditConfiguration(1, 0,
      AUDIT_TRIGGERS_ONLY,
      [1], [2], ratesProvider.address, CHF_BYTES);
  });

  it('should test', async function () {

  });
});
