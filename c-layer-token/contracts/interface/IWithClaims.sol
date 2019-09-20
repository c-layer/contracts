pragma solidity >=0.5.0 <0.6.0;

import "./IClaimable.sol";


/**
 * @title IWithClaims
 * @dev IWithClaims interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract IWithClaims {
  function claimables() public view returns (IClaimable[] memory);
  function hasClaims(address _holder) public view returns (bool);
  function defineClaimables(IClaimable[] memory _claimables) public;
  event ClaimablesDefined();
}
