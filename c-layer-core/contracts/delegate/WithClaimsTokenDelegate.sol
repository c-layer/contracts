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
   * A proof of ownership will be made if any claims can be made by the participants
   */
  function transfer(
    address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    bool proofFrom = hasClaims(msg.sender, _sender);
    bool proofTo = hasClaims(msg.sender, _to);

    return super.transferWithProofs(
      _sender,
      _to,
      _value,
      proofFrom,
      proofTo
    );
  }

  /**
   * @dev Override the transfer function with transferWithProofs
   * A proof of ownership will be made if any claims can be made by the participants
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    bool proofFrom = hasClaims(msg.sender, _from);
    bool proofTo = hasClaims(msg.sender, _to);

    return super.transferFromWithProofs(
      _sender,
      _from,
      _to,
      _value,
      proofFrom,
      proofTo
    );
  }

  /**
   * @dev transfer with proofs
   */
  function transferWithProofs(
    address _sender,
    address _to,
    uint256 _value,
    bool _proofFrom,
    bool _proofTo
  ) public returns (bool)
  {
    bool proofFrom = _proofFrom || hasClaims(msg.sender, _sender);
    bool proofTo = _proofTo || hasClaims(msg.sender, _to);

    return super.transferWithProofs(
      _sender,
      _to,
      _value,
      proofFrom,
      proofTo
    );
  }

  /**
   * @dev transfer from with proofs
   */
  function transferFromWithProofs(
    address _sender,
    address _from,
    address _to,
    uint256 _value,
    bool _proofFrom,
    bool _proofTo
  ) public returns (bool)
  {
    bool proofFrom = _proofFrom || hasClaims(msg.sender, _from);
    bool proofTo = _proofTo || hasClaims(msg.sender, _to);

    return super.transferFromWithProofs(
      _sender,
      _from,
      _to,
      _value,
      proofFrom,
      proofTo
    );
  }

  /**
   * @dev Returns true if there are any claims associated to this token
   * to be made at this time for the _holder
   */
  function hasClaims(address _token, address _holder) public view returns (bool) {
    uint256 lastTransaction = tokens_[_token].audits[0].addressData[_holder].lastTransactionAt;
    IClaimable[] memory claims_ = tokens_[_token].claims;
    for (uint256 i = 0; i < claims_.length; i++) {
      if (claims_[i].hasClaimsSince(_holder, lastTransaction)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @dev define claims contract to this token
   */
  function defineClaims(
    address _token, IClaimable[] memory _claims)
    public returns (bool)
  {
    tokens_[_token].claims = _claims;
    emit ClaimsDefined(_token, _claims);
    return true;
  }
}
