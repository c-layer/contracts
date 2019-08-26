pragma solidity >=0.5.0 <0.6.0;

import "../storage/TokenWithClaimsStorage.sol";
import "./ProvableOwnershipTokenCore.sol";


/**
 * @title TokenWithClaimsCore
 * @dev TokenWithClaimsCore contract
 * TokenWithClaims is a token that will create a
 * proofOfOwnership during transfers if a claim can be made.
 * Holder may ask for the claim later using the proofOfOwnership
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * E01: Claimable address must be defined
 * E02: Claimables parameter must not be empty
 * E03: Claimable does not exist
**/
contract TokenWithClaimsCore is ProvableOwnershipTokenCore, TokenWithClaimsStorage {

  /**
   * @dev define claimables contract to this token
   */
  function defineClaimables(
    address _token, IClaimable[] memory _claimables)
    public onlyOperator
  {
    tokenClaimables[_token] = _claimables;
    emit ClaimablesDefined(_token);
  }

  event ClaimablesDefined(address _token);
}
