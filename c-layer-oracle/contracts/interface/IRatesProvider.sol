pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IRatesProvider
 * @dev IRatesProvider interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IRatesProvider {
  function rateWEIPerCHFCent() public view returns (uint256);
  function convertWEIToCHFCent(uint256 _amountWEI)
    public view returns (uint256);

  function convertCHFCentToWEI(uint256 _amountCHFCent)
    public view returns (uint256);
}
