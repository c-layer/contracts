pragma solidity >=0.5.0 <0.6.0;

import "./ProvableOwnershipTokenDelegate.sol";
import "../interface/IClaimable.sol";


/**
 * @title WithClaimsTokenDelegate
 * @dev WithClaimsTokenDelegate contract
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
contract WithClaimsTokenDelegate is ProvableOwnershipTokenDelegate {

  /**
   * @dev Override the transfer function with transferWithProofs
   * A proof of ownership will be made if any claimables can be made by the participants
   */
  function transfer(
    address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    if (super.transfer(_sender, _to, _value)) {
      if (hasClaims(msg.sender, _sender)) {
        createProof(msg.sender, _sender);
      }

      if (hasClaims(msg.sender, _to)) {
        createProof(msg.sender, _to);
      }

      return true;
    }
    return false;
  }

  /**
   * @dev Override the transfer function with transferWithProofs
   * A proof of ownership will be made if any claimables can be made by the participants
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    if (super.transferFrom(_sender, _from, _to, _value)) {
      if (hasClaims(msg.sender, _from)) {
        createProof(msg.sender, _from);
      }

      if (hasClaims(msg.sender, _to)) {
        createProof(msg.sender, _to);
      }

      return true;
    }
    return false;
   }

  /**
   * @dev Returns true if there are any claimables associated to this token
   * to be made at this time for the _holder
   */
  function hasClaims(address _token, address _holder) public view returns (bool) {
    uint256 lastTransaction = tokens_[_token].audits[0].addressData[_holder].lastTransactionAt;
    IClaimable[] memory claimables_ = tokens_[_token].claimables;
    for (uint256 i = 0; i < claimables_.length; i++) {
      if (claimables_[i].hasClaimsSince(_holder, lastTransaction)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @dev define claimables contract to this token
   */
  function defineClaimables(
    address _token, IClaimable[] memory _claimables)
    public returns (bool)
  {
    tokens_[_token].claimables = _claimables;
    emit ClaimablesDefined(_token, _claimables);
    return true;
  }
}
