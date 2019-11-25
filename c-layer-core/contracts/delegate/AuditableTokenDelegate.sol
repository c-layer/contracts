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
    uint256 _configurationId
    ) internal view returns (bool)
  {
    AuditConfiguration storage auditConfiguration_ =
      auditConfigurations[_configurationId];

    if (auditConfiguration_.mode == AuditMode.NEVER) {
      return false;
    }
    if (auditConfiguration_.triggerTokens[_transferData.token]
      || auditConfiguration_.triggerSenders[_transferData.sender]
      || auditConfiguration_.triggerReceivers[_transferData.receiver])
    {
      if (auditConfiguration_.mode == AuditMode.TRIGGERS_EXCLUDED) {
        return false;
      }
    } else {
      if (auditConfiguration_.mode == AuditMode.TRIGGERS_ONLY) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev Update audit data
   */
  function updateAuditInternal(
    TransferData memory _transferData) internal
  {
    uint256[] storage configurations = delegatesConfigurations[proxyDelegates[_transferData.token]];

    for (uint256 i=0; i < configurations.length; i++) {
      updateAuditPrivate(configurations[i], _transferData);
    }
  }

  function updateAuditPrivate(uint256 _configurationId, TransferData memory _transferData) private {
    AuditConfiguration memory auditConfiguration_ = auditConfigurations[_configurationId];

    /**** AUDIT STORAGE ****/
    AuditStorage storage auditStorage = (
      (auditConfiguration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
    )[auditConfiguration_.scopeId];

    /**** FILTERS ****/
    if (!isAuditRequiredInternal(_transferData, _configurationId)) {
      return;
    }

    /**** UPDATE AUDIT DATA ****/
    if (auditConfiguration_.sharedData) {
      updateSenderAuditPrivate(auditStorage.sharedData, auditConfiguration_, _transferData);
      updateReceiverAuditPrivate(auditStorage.sharedData, auditConfiguration_, _transferData);
    }
    if (auditConfiguration_.userData) {
      fetchSenderUser(_transferData);
      fetchReceiverUser(_transferData);

      if (_transferData.senderId != 0) {
        updateSenderAuditPrivate(auditStorage.userData[_transferData.senderId], auditConfiguration_, _transferData);
      }

      if (_transferData.receiverId != 0) {
        updateReceiverAuditPrivate(auditStorage.userData[_transferData.receiverId], auditConfiguration_, _transferData);
      }
    }
    if (auditConfiguration_.addressData) {
      updateSenderAuditPrivate(auditStorage.addressData[_transferData.sender], auditConfiguration_, _transferData);
      updateReceiverAuditPrivate(auditStorage.addressData[_transferData.receiver], auditConfiguration_, _transferData);
    }
  }

  function updateSenderAuditPrivate(
    AuditData storage _senderAudit,
    AuditConfiguration memory _auditConfiguration,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_auditConfiguration.fieldCreatedAt && _senderAudit.createdAt == 0) {
      _senderAudit.createdAt = currentTime;
    }
    if (_auditConfiguration.fieldLastTransactionAt) {
      _senderAudit.lastTransactionAt = currentTime;
    }
    if (_auditConfiguration.fieldLastEmissionAt) {
      _senderAudit.lastEmissionAt = currentTime;
    }
    if (_auditConfiguration.fieldCumulatedEmission) {
      if (_auditConfiguration.scopeCore) {
        fetchConvertedValue(_transferData);
        // may overflow
        _senderAudit.cumulatedEmission += _transferData.convertedValue;
      } else {
        // may overflow
        _senderAudit.cumulatedEmission += _transferData.value;
      }
    }
  }

  function updateReceiverAuditPrivate(
    AuditData storage _receiverAudit,
    AuditConfiguration memory _auditConfiguration,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_auditConfiguration.fieldCreatedAt && _receiverAudit.createdAt == 0) {
      _receiverAudit.createdAt = currentTime;
    }
    if (_auditConfiguration.fieldLastTransactionAt) {
      _receiverAudit.lastTransactionAt = currentTime;
    }
    if (_auditConfiguration.fieldLastReceptionAt) {
      _receiverAudit.lastReceptionAt = currentTime;
    }
    if (_auditConfiguration.fieldCumulatedReception) {
      if (_auditConfiguration.scopeCore) {
        fetchConvertedValue(_transferData);
        // may overflow
        _receiverAudit.cumulatedReception += _transferData.convertedValue;
      } else {
        // may overflow
        _receiverAudit.cumulatedReception += _transferData.value;
      }
    }
  }
}
