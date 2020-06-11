pragma solidity ^0.6.0;

import "./MintableTokenDelegate.sol";
import "./RuleEngineDelegate.sol";
import "./SeizableDelegate.sol";
import "./FreezableDelegate.sol";
import "./LockableDelegate.sol";
import "./LimitableTransferabilityDelegate.sol";


/**
 * @title Compliant Token Delegate
 * @dev Compliant Token Delegate
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messagesa
 * CT01: The token must not be locked
 * CT02: The addresses must not be frozen
 * CT03: The transfer rules must be valid
 * CT04: The sender must remains below its limit
 * CT05: The rceiver must remains below its limit
 */
contract CompliantTokenDelegate is
  LimitableTransferabilityDelegate,
  RuleEngineDelegate,
  SeizableDelegate,
  FreezableDelegate,
  LockableDelegate,
  MintableTokenDelegate
{

  uint256 constant AUDIT_CONFIG_REQUIREMENTS = 1; // 1- Transfer Limitst

  /**
   * @dev check config requirements
   **/
  function checkConfigurations(uint256[] memory _auditConfigurationIds)
    override public returns (bool)
  {
    return (_auditConfigurationIds.length >= AUDIT_CONFIG_REQUIREMENTS);
  }

 /**
   * @dev transfer
   */
  function transferInternal(STransferData memory _transferData)
    override internal returns (bool)
  {
    require(!isLocked(_transferData), "CT01");
    require(!isFrozen(_transferData), "CT02");
    require(areTransferRulesValid(_transferData), "CT03");

    STransferAuditData memory _transferAuditData =
      prepareAuditInternal(_transferData);
    require(isTransferBelowLimits(_transferData, _transferAuditData) == TransferCode.OK, "CT04");

    return super.transferInternal(_transferData)
      && updateAllAuditsInternal(_transferData, _transferAuditData);
  }

  /**
   * @dev can transfer
   */
  function canTransferInternal(STransferData memory _transferData)
    override internal view returns (TransferCode code)
  {
    if (isLocked(_transferData)) {
      return TransferCode.LOCKED;
    }
    if (isFrozen(_transferData)) {
      return TransferCode.FROZEN;
    }
    if (!areTransferRulesValid(_transferData)) {
      return TransferCode.RULE;
    }

    STransferAuditData memory _transferAuditData =
      prepareAuditInternal(_transferData);

    code = isTransferBelowLimits(_transferData, _transferAuditData);
    return (code == TransferCode.OK) ? 
      super.canTransferInternal(_transferData) : code;
  }
}
