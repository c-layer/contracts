pragma solidity >=0.5.0 <0.6.0;

import "./OracleEnrichedTokenDelegate.sol";
import "../util/convert/BytesConvert.sol";


/**
 * @title AuditableTokenDelegate
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * AT01: Configuration and User Registry must have the same currency
 **/
contract AuditableTokenDelegate is OracleEnrichedTokenDelegate {
  using BytesConvert for bytes;

  /**
   * @dev default transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool) {
    if (super.transferInternal(_transferData)) {
      updateAuditInternal(_transferData);
      return true;
    }
    return false;
  }

  /**
   * @dev isAuditRequiredInternal
   */
  function isAuditRequiredInternal(
    TransferData memory _transferData,
    AuditConfiguration storage _configuration
    ) internal view returns (bool)
  {
    if (_configuration.mode == AuditMode.NEVER) {
      return false;
    }
    if (_configuration.triggerTokens[_transferData.token]
      || _configuration.triggerSenders[_transferData.sender]
      || _configuration.triggerReceivers[_transferData.receiver])
    {
      if (_configuration.mode == AuditMode.TRIGGERS_EXCLUDED) {
        return false;
      }
    } else {
      if (_configuration.mode == AuditMode.TRIGGERS_ONLY) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev can transfer internal
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    uint256[] memory configurationIds = delegatesConfigurations[proxyDelegateIds[_transferData.token]];

    for (uint256 i=0; i < configurationIds.length; i++) {
      AuditConfiguration memory configuration_ =
        auditConfigurations[configurationIds[i]];
      if (configuration_.currency != bytes32(0)
        && (address(configuration_.ratesProvider) == address(0)
        || auditConfigurations[configurationIds[i]].currency != currency)) {
        return TransferCode.INVALID_CURRENCY_CONFIGURATION;
      }
    }

    return super.canTransferInternal(_transferData);
  }

  /**
   * @dev Update audit data
   */
  function updateAuditInternal(
    TransferData memory _transferData) internal returns (bool)
  {
    uint256[] memory configurationIds = delegatesConfigurations[proxyDelegateIds[_transferData.token]];

    for (uint256 i=0; i < configurationIds.length; i++) {
      // triggers are only accessible in storage
      AuditConfiguration storage configuration_ = auditConfigurations[configurationIds[i]];

      require(configuration_.currency == bytes32(0)
        || (address(configuration_.ratesProvider) != address(0)
        && configuration_.currency == currency), "AT01");
      updateAuditPrivate(configuration_, _transferData);
    }
  }

  function updateAuditPrivate(
    AuditConfiguration storage _configuration,
    TransferData memory _transferData) private
  {
    /**** AUDIT STORAGE ****/
    AuditStorage storage auditStorage = (
      (_configuration.scopeCore) ? audits[address(this)] : audits[_transferData.token]
    )[_configuration.scopeId];

    /**** FILTERS ****/
    if (!isAuditRequiredInternal(_transferData, _configuration)) {
      return;
    }

    /**** UPDATE AUDIT DATA ****/
    if (_configuration.storageMode == AuditStorageMode.SHARED) {
      updateSenderAuditPrivate(auditStorage.sharedData, _configuration, _transferData);
      updateReceiverAuditPrivate(auditStorage.sharedData, _configuration, _transferData);
    }
    if (_configuration.storageMode == AuditStorageMode.USER_ID) {
      fetchSenderUser(_transferData, _configuration.userKeys);
      fetchReceiverUser(_transferData, _configuration.userKeys);

      if (_transferData.senderId != 0) {
        updateSenderAuditPrivate(auditStorage.userData[_transferData.senderId], _configuration, _transferData);
      }

      if (_transferData.receiverId != 0) {
        updateReceiverAuditPrivate(auditStorage.userData[_transferData.receiverId], _configuration, _transferData);
      }

      /*emit TransferAuditLog(
        _transferData.senderId,
        _transferData.receiverId,
        auditStorage.userData[_transferData.senderId].cumulatedEmission,
        (_configuration.userKeys.length > 2) ? _transferData.senderKeys[1] : 0,
        auditStorage.userData[_transferData.senderId].cumulatedReception,
        (_configuration.userKeys.length > 2) ? _transferData.senderKeys[2] : 0
      );*/
    }
    if (_configuration.storageMode == AuditStorageMode.ADDRESS) {
      updateSenderAuditPrivate(auditStorage.addressData[_transferData.sender], _configuration, _transferData);
      updateReceiverAuditPrivate(auditStorage.addressData[_transferData.receiver], _configuration, _transferData);
    }
  }

  function updateSenderAuditPrivate(
    AuditData storage _senderAudit,
    AuditConfiguration memory _configuration,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_configuration.fieldCreatedAt && _senderAudit.createdAt == 0) {
      _senderAudit.createdAt = currentTime;
    }
    if (_configuration.fieldLastTransactionAt) {
      _senderAudit.lastTransactionAt = currentTime;
    }
    if (_configuration.fieldLastEmissionAt) {
      _senderAudit.lastEmissionAt = currentTime;
    }
    if (_configuration.fieldCumulatedEmission) {
      if (_configuration.currency != bytes32(0)) {
        fetchConvertedValue(_transferData,
          _configuration.ratesProvider,
          _configuration.currency);
        _senderAudit.cumulatedEmission =
          _senderAudit.cumulatedEmission.add(_transferData.convertedValue);
      } else {
        _senderAudit.cumulatedEmission =
          _senderAudit.cumulatedEmission.add(_transferData.value);
      }
    }
  }

  function updateReceiverAuditPrivate(
    AuditData storage _receiverAudit,
    AuditConfiguration memory _configuration,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_configuration.fieldCreatedAt && _receiverAudit.createdAt == 0) {
      _receiverAudit.createdAt = currentTime;
    }
    if (_configuration.fieldLastTransactionAt) {
      _receiverAudit.lastTransactionAt = currentTime;
    }
    if (_configuration.fieldLastReceptionAt) {
      _receiverAudit.lastReceptionAt = currentTime;
    }
    if (_configuration.fieldCumulatedReception) {
      if (_configuration.currency != bytes32(0)) {
        fetchConvertedValue(_transferData,
          _configuration.ratesProvider,
          _configuration.currency);
        _receiverAudit.cumulatedReception =
          _receiverAudit.cumulatedReception.add(_transferData.convertedValue);
      } else {
        _receiverAudit.cumulatedReception =
          _receiverAudit.cumulatedReception.add(_transferData.value);
      }
    }
  }
}
