pragma solidity ^0.6.0;

//import "./WithClaimsTokenDelegate.sol";
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

  uint256 constant AUDIT_CONFIG_REQUIREMENTS = 2; // 0- Default, 1- Transfer Limitst
  uint256 constant USER_KEYS_REQUIREMENTS = 2; // 0- Sender limit, 1- Receiver limit

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
    require(!areFrozen(_transferData), "CT02");
    require(areTransferRulesValid(_transferData), "CT03");
    require(belowTransferLimit(_transferData) == TransferCode.OK, "CT04");

    return super.transferInternal(_transferData)
       && updateAuditInternal(_transferData);
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
    if (areFrozen(_transferData)) {
      return TransferCode.FROZEN;
    }
    if (!areTransferRulesValid(_transferData)) {
      return TransferCode.RULE;
    }

    code = belowTransferLimit(_transferData);
    return (code == TransferCode.OK) ? 
      super.canTransferInternal(_transferData) : code;
  }
}
