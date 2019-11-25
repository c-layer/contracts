pragma solidity >=0.5.0 <0.6.0;

import "./delegate/MintableTokenDelegate.sol";
import "./delegate/CLayerTokenDelegate.sol";

/**
 * @title Token Delegate
 * @dev Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract TokenDelegate is CLayerTokenDelegate, MintableTokenDelegate {
  /**
   * @dev default audit data config
   */
  function defaultAuditConfigurations() internal pure returns (AuditConfiguration[] memory) {
    AuditConfiguration[] memory auditConfigurations_ = new AuditConfiguration[](1);
    auditConfigurations_[0] = AuditConfiguration(
      AuditMode.ALWAYS,
      0, false, // scopeId
      false, false, true, // addressData
      false, true, false, false, false, false // last transaction
    );
    return auditConfigurations_;
  }
}
