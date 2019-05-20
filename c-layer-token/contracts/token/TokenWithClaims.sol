pragma solidity >=0.5.0 <0.6.0;

import "./ProvableOwnershipToken.sol";
import "../ownership/Ownable.sol";
import "../interface/IWithClaims.sol";


/**
 * @title TokenWithClaims
 * @dev TokenWithClaims contract
 * TokenWithClaims is a token that will create a
 * proofOfOwnership during transfers if a claim can be made.
 * Holder may ask for the claim later using the proofOfOwnership
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * E01: Claimable address must be defined
 * E02: Claimables parameter must not be empty
 * E03: Claimable does not exist
**/
contract TokenWithClaims is IWithClaims, Ownable, ProvableOwnershipToken {

  IClaimable[] claimables_;

  /**
   * @dev Constructor
   */
  constructor(IClaimable[] memory _claimables) public {
    claimables_ = _claimables;
  }

  /**
   * @dev Returns the Claimable associated to the specified claimableId
   */
  function claimables() public view returns (IClaimable[] memory) {
    return claimables_;
  }

  /**
   * @dev Returns true if there are any claims associated to this token
   * to be made at this time for the _holder
   */
  function hasClaims(address _holder) public view returns (bool) {
    uint256 lastTransaction = lastTransactionAt(_holder);
    for (uint256 i = 0; i < claimables_.length; i++) {
      if (claimables_[i].hasClaimsSince(_holder, lastTransaction)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @dev Override the transfer function with transferWithProofs
   * A proof of ownership will be made if any claims can be made by the participants
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    bool proofFrom = hasClaims(msg.sender);
    bool proofTo = hasClaims(_to);

    return super.transferWithProofs(
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
  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool)
  {
    bool proofFrom = hasClaims(_from);
    bool proofTo = hasClaims(_to);

    return super.transferFromWithProofs(
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
    address _to,
    uint256 _value,
    bool _proofFrom,
    bool _proofTo
  ) public returns (bool)
  {
    bool proofFrom = _proofFrom || hasClaims(msg.sender);
    bool proofTo = _proofTo || hasClaims(_to);

    return super.transferWithProofs(
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
    address _from,
    address _to,
    uint256 _value,
    bool _proofFrom,
    bool _proofTo
  ) public returns (bool)
  {
    bool proofFrom = _proofFrom || hasClaims(_from);
    bool proofTo = _proofTo || hasClaims(_to);

    return super.transferFromWithProofs(
      _from,
      _to,
      _value,
      proofFrom,
      proofTo
    );
  }

  /**
   * @dev define claimables contract to this token
   */
  function defineClaimables(IClaimable[] memory _claimables) public onlyOwner {
    claimables_ = _claimables;
    emit ClaimablesDefined();
  }
}
