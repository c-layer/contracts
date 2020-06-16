pragma solidity >=0.5.0 <0.6.0;


/**
 * @title RatesProviderMock
 * @dev RatesProviderMock interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract RatesProviderMock {

  uint256 private rate = 1500;

  function convert(uint256 _amount, bytes32, bytes32)
    public view returns (uint256)
  {
    return _amount * rate / 1000;
  }
}
