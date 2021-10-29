'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const Uint256ConvertMock = artifacts.require('Uint256ConvertMock.sol');

contract('Uint256Convert', function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await Uint256ConvertMock.new();
  });

  it('should convert to string', async function () {
    const uint256 = await contract.convertToString('0');
    assert.equal(uint256, '0', '0');
  });

  it('should convert to string', async function () {
    const uint256 = await contract.convertToString('10');
    assert.equal(uint256, '10', '10');
  });
});
