pragma solidity >=0.5.0 <0.6.0;

import "./ProvableOwnershipTokenStorage.sol";
import "../interface/IClaimable.sol";


/**
 * @title TokenWithClaimsStorage
 * @dev TokenWithClaimsStorage contract
 * TokenWithClaims is a token that will create a
 * proofOfOwnership during transfers if a claim can be made.
 * Holder may ask for the claim later using the proofOfOwnership
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
**/
contract TokenWithClaimsStorage is ProvableOwnershipTokenStorage {

  mapping (address => IClaimable[]) internal tokenClaimables;

  /**
   * @dev Returns the Claimable associated to the specified claimableId
   */
  function claimables(address _token) public view returns (IClaimable[] memory) {
    return tokenClaimables[_token];
  }

  /**
   * @dev Returns true if there are any claims associated to this token
   * to be made at this time for the _holder
   */
  function hasClaims(address _token, address _holder) public view returns (bool) {
    uint256 lastTransaction = lastTransactionAt(_token, _holder);
    IClaimable[] memory claimables_ = tokenClaimables[_token];
    for (uint256 i = 0; i < claimables_.length; i++) {
      if (claimables_[i].hasClaimsSince(_holder, lastTransaction)) {
        return true;
      }
    }
    return false;
  }
}
