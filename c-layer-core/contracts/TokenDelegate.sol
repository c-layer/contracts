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
  function auditConfigs() internal pure returns (AuditConfig[] memory) {
    AuditConfig[] memory auditConfigs_ = new AuditConfig[](2);
    auditConfigs_[0] = AuditConfig(
      0, true, // scopeId
      false, true, false, // userData
      true, false, // selectorSender
      false, false, false, false, false, true // only cumulated reception
    );
    auditConfigs_[1] = AuditConfig(
      0, false, // scopeId
      false, false, true, // addressData
      false, false, // selectorSender
      false, true, false, false, false, false // last transaction
    );
    return auditConfigs_;
  }
}
