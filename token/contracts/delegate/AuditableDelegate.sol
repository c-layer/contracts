pragma solidity ^0.6.0;

import "./OracleEnrichedDelegate.sol";


/**
 * @title AuditableDelegate
 * @dev Auditable delegate contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * AT01: Configuration and User Registry must have the same currency
 **/
contract AuditableDelegate is OracleEnrichedDelegate {

  uint256 constant DEFAULT_CONFIGURATION = 0;
  uint256 constant DEFAULT_SCOPE = 0;

  /**
   * @dev isAuditRequiredInternal
   */
  function isAuditRequiredInternal(uint256 _configurationId, STransferData memory _transferData)
    internal view returns (bool)
  {
    AuditConfiguration storage configuration_ = auditConfigurations[_configurationId];
    if (configuration_.mode == AuditMode.NEVER) {
      return false;
    }
    if (configuration_.mode == AuditMode.ALWAYS
      || configuration_.mode == AuditMode.ALWAYS_TRIGGERS_EXCLUDED
      || configuration_.mode == AuditMode.ALWAYS_TRIGGERS_ONLY) {
      return true;
    }

    if (configuration_.triggerTokens[_transferData.sender]
      || configuration_.triggerSenders[_transferData.receiver]
      || configuration_.triggerReceivers[_transferData.token])
    {
      return (configuration_.mode != AuditMode.WHEN_TRIGGERS_UNMATCHED);
    } else {
      return (configuration_.mode != AuditMode.WHEN_TRIGGERS_MATCHED);
    }
  }

  /**
   * @dev Update audit data
   */
  function updateAuditInternal(
    STransferData memory _transferData) internal returns (bool)
  {
    uint256[] memory configurationIds = delegatesConfigurations[proxyDelegateIds[_transferData.token]];
    for (uint256 i=1; i < configurationIds.length; i++) {
      updateAuditPrivate(configurationIds[i], _transferData);
    }
    return true;
  }

  function updateAuditPrivate(
    uint256 _configurationId,
    STransferData memory _transferData) private
  {
    AuditConfiguration storage configuration_ = auditConfigurations[_configurationId];

    /**** FILTERS ****/
    if (!isAuditRequiredInternal(_configurationId, _transferData)) {
      return;
    }

    /**** AUDIT STORAGE ****/
    AuditStorage storage auditStorage = (
      (configuration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
    )[configuration_.scopeId];

    if (configuration_.currency != bytes32(0)) {
      fetchConvertedValue(_transferData,
        configuration_.ratesProvider,
        configuration_.currency);
    }

    /**** UPDATE AUDIT DATA ****/
    if ((configuration_.mode != AuditMode.ALWAYS_TRIGGERS_EXCLUDED || !configuration_.triggerSenders[_transferData.sender])
      && (configuration_.mode != AuditMode.ALWAYS_TRIGGERS_ONLY || configuration_.triggerSenders[_transferData.sender]))
    {
      if (configuration_.storageMode == AuditStorageMode.SHARED) {
        updateSenderAuditPrivate(auditStorage.sharedData, configuration_, _transferData);
      }
      if (configuration_.storageMode == AuditStorageMode.USER_ID) {
        fetchSenderUser(_transferData, configuration_.senderKeys);
        if (_transferData.senderId != 0) {
          updateSenderAuditPrivate(auditStorage.userData[_transferData.senderId], configuration_, _transferData);
        }
      }
      if (configuration_.storageMode == AuditStorageMode.ADDRESS) {
        updateSenderAuditPrivate(auditStorage.addressData[_transferData.sender], configuration_, _transferData);
      }
    }

    if ((configuration_.mode != AuditMode.ALWAYS_TRIGGERS_EXCLUDED || !configuration_.triggerSenders[_transferData.receiver])
      && (configuration_.mode != AuditMode.ALWAYS_TRIGGERS_ONLY || configuration_.triggerSenders[_transferData.receiver]))
    {
      if (configuration_.storageMode == AuditStorageMode.SHARED) {
        updateReceiverAuditPrivate(auditStorage.sharedData, configuration_, _transferData);
      }
      if (configuration_.storageMode == AuditStorageMode.USER_ID) {
        fetchReceiverUser(_transferData, configuration_.receiverKeys);
        if (_transferData.receiverId != 0) {
          updateReceiverAuditPrivate(auditStorage.userData[_transferData.receiverId], configuration_, _transferData);
        }
      }
      if (configuration_.storageMode == AuditStorageMode.ADDRESS) {
        updateReceiverAuditPrivate(auditStorage.addressData[_transferData.receiver], configuration_, _transferData);
      }
    }
  }

  function updateSenderAuditPrivate(
    AuditData storage _senderAudit,
    AuditConfiguration memory _configuration,
    STransferData memory _transferData) private
  {
    uint64 currentTime = currentTime();
    if (_configuration.fieldCreatedAt && _senderAudit.createdAt == 0) {
      _senderAudit.createdAt = currentTime;
    }
    if (_configuration.fieldLastTransactionAt) {
      _senderAudit.lastTransactionAt = currentTime;
    }
    if (_configuration.fieldCumulatedEmission) {
      _senderAudit.cumulatedEmission = (_configuration.currency != bytes32(0)) ?
         _senderAudit.cumulatedEmission.add(_transferData.convertedValue) :
         _senderAudit.cumulatedEmission.add(_transferData.value);
    }
  }

  function updateReceiverAuditPrivate(
    AuditData storage _receiverAudit,
    AuditConfiguration memory _configuration,
    STransferData memory _transferData) private
  {
    uint64 currentTime = currentTime();
    if (_configuration.fieldCreatedAt && _receiverAudit.createdAt == 0) {
      _receiverAudit.createdAt = currentTime;
    }
    if (_configuration.fieldLastTransactionAt) {
      _receiverAudit.lastTransactionAt = currentTime;
    }
    if (_configuration.fieldCumulatedReception) {
      _receiverAudit.cumulatedReception = (_configuration.currency != bytes32(0)) ?
        _receiverAudit.cumulatedReception.add(_transferData.convertedValue) :
        _receiverAudit.cumulatedReception.add(_transferData.value);
    }
  }
}
