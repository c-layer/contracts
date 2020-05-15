pragma solidity >=0.5.0 <0.6.0;

import "./ProvableOwnershipTokenDelegate.sol";


/**
 * @title WithClaimsTokenDelegate
 * @dev WithClaimsTokenDelegate contract
 * TokenWithClaims is a token that will create a
 * proofOfOwnership during transfers if a claim can be made.
 * Holder may ask for the claim later using the proofOfOwnership
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * @notice Beware that claimables should only check if a claims exists
 * @notice Adding too many claims or too costly claims may prevents
 * @notice transfers due to a gas cost too high.
 * @notice Removing claims will resume the situation.
 *
 * Error messages
 * E01: Claimable address must be defined
 * E02: Claimables parameter must not be empty
 * E03: Claimable does not exist
**/
contract WithClaimsTokenDelegate is ProvableOwnershipTokenDelegate {

  /**
   * @dev audit requirements
   **/
  function auditRequirements() public pure returns (uint256) {
    return super.auditRequirements() + 1;
  }

  /**
   * @dev Overriden transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    TokenData storage token = tokens[msg.sender];
    AuditStorage storage auditStorage = audits[msg.sender][uint256(AUDIT_CONFIGURATION.PROOF_OF_OWNERSHIP)];

    if (token.latestClaimAt > auditStorage.addressData[_transferData.sender].lastTransactionAt) {
      createProof(msg.sender, _transferData.sender);
    }
    if (token.latestClaimAt > auditStorage.addressData[_transferData.receiver].lastTransactionAt) {
      createProof(msg.sender, _transferData.receiver);
    }
    return super.transferInternal(_transferData);
  }

  /**
   * @dev define claim contract to this token
   */
  function defineClaim(
    address _token, address _claim, uint256 _claimAt)
    public returns (bool)
  {
    if (_claimAt > tokens[_token].latestClaimAt) {
      tokens[_token].latestClaimAt = _claimAt;
    }

    emit ClaimDefined(_token, _claim, _claimAt);
    return true;
  }
}
