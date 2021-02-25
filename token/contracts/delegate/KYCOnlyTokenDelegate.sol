pragma solidity ^0.8.0;

import "./MintableTokenDelegate.sol";
import "./RuleEngineDelegate.sol";
import "./SeizableDelegate.sol";
import "./FreezableDelegate.sol";
import "./LockableDelegate.sol";
import "./KYCOnlyTransferabilityDelegate.sol";


/**
 * @title KYCOnly Token Delegate
 * @dev KYCOnly Token Delegate
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messagesa
 * KOT01: The token must not be locked
 * KOT02: The addresses must not be frozen
 * KOT03: The transfer rules must be valid
 * KOT04: The sender or receiver are not valid
 */
contract KYCOnlyTokenDelegate is
  KYCOnlyTransferabilityDelegate,
  RuleEngineDelegate,
  SeizableDelegate,
  FreezableDelegate,
  LockableDelegate,
  MintableTokenDelegate
{

  uint256 internal constant AUDIT_CONFIG_REQUIREMENTS = 1; // 1- Transfer Limits

  /**
   * @dev check config requirements
   **/
  function checkConfigurations(uint256[] calldata _auditConfigurationIds)
    override public pure returns (bool)
  {
    return (_auditConfigurationIds.length >= AUDIT_CONFIG_REQUIREMENTS);
  }

 /**
   * @dev transfer
   */
  function transferInternal(STransferData memory _transferData)
    override internal returns (bool)
  {
    require(!isLocked(_transferData), "KOT01");
    require(!isFrozen(_transferData), "KOT02");
    require(areTransferRulesValid(_transferData), "KOT03");

    STransferAuditData memory _transferAuditData =
      prepareAuditInternal(_transferData);
    require(hasTransferValidUsers(_transferData, _transferAuditData) == TransferCode.OK, "KOT04");

    return super.transferInternal(_transferData);
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
    code = hasTransferValidUsers(_transferData, _transferAuditData);

    return (code == TransferCode.OK) ? 
      super.canTransferInternal(_transferData) : code;
  }
}
