pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IClaimable
 * @dev IClaimable interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract IClaimable {
  function hasClaimsSince(address _address, uint256 at)
    external view returns (bool);
}
