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

  /**
   * @dev isAuditRequiredInternal
   */
  function isAuditRequiredInternal(
    AuditConfiguration storage _configuration, STransferData memory _transferData)
    internal view returns (bool)
  {
    if (_configuration.mode == AuditMode.NEVER) {
      return false;
    }
    if (_configuration.mode == AuditMode.ALWAYS
      || (_configuration.mode == AuditMode.ALWAYS_TRIGGERS_EXCLUDED
        && !_configuration.triggerTokens[_transferData.token]))
    {
      return true;
    }

    if (_configuration.triggerTokens[_transferData.token]
      || _configuration.triggerSenders[_transferData.sender]
      || _configuration.triggerReceivers[_transferData.receiver])
    {
      return (_configuration.mode == AuditMode.WHEN_TRIGGERS_MATCHED
        || _configuration.mode == AuditMode.TRIGGERS_ONLY);
    } else {
      return (_configuration.mode == AuditMode.WHEN_TRIGGERS_UNMATCHED);
    }
  }

  /**
   * @dev Update audit data
   */
  function updateAllAuditsInternal(
    STransferData memory _transferData) internal returns (bool)
  {
    uint256[] storage configurationIds = delegatesConfigurations[proxyDelegateIds[_transferData.token]];
    for (uint256 i=0; i < configurationIds.length; i++) {
      updateAuditInternal(configurationIds[i], _transferData);
    }
    return true;
  }

  function updateAuditInternal(
    uint256 _configurationId,
    STransferData memory _transferData) internal
  {
    AuditConfiguration storage configuration_ = auditConfigurations[_configurationId];

    /**** FILTERS ****/
    if (!isAuditRequiredInternal(configuration_, _transferData)) {
      return;
    }

    /**** AUDIT STORAGE ****/
    AuditStorage storage auditStorage = (
      (configuration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
    )[configuration_.scopeId];

    if (configuration_.currency != bytes32(0)) {
      fetchConvertedValue(_transferData, configuration_);
    }

    /**** UPDATE AUDIT DATA ****/
    if ((configuration_.mode != AuditMode.ALWAYS_TRIGGERS_EXCLUDED || !configuration_.triggerSenders[_transferData.sender])
      && (configuration_.mode != AuditMode.TRIGGERS_ONLY || configuration_.triggerSenders[_transferData.sender]))
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

    if ((configuration_.mode != AuditMode.ALWAYS_TRIGGERS_EXCLUDED || !configuration_.triggerReceivers[_transferData.receiver])
      && (configuration_.mode != AuditMode.TRIGGERS_ONLY || configuration_.triggerReceivers[_transferData.receiver]))
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
    AuditConfiguration storage _configuration,
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
    AuditConfiguration storage _configuration,
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
