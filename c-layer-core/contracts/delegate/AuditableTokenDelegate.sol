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

  struct AuditConfig {
    uint256 scopeId;
    bool scopeCore;
    bool sharedData;
    bool userData;
    bool addressData;
    bool selectorSender;
    bool selectorReceiver;
    bool fieldCreatedAt;
    bool fieldLastTransactionAt;
    bool fieldLastEmissionAt;
    bool fieldLastReceptionAt;
    bool fieldCumulatedEmission;
    bool fieldCumulatedReception;
  }

  /**
   * @dev default audit data config
   * @dev defines the audit config for this deletage
   * @dev the function should be overriden by children to set an audit config
   * @dev WARNING: Multiple AuditConfig with the same scope is not supported
   */
  function auditConfigs() internal pure returns (AuditConfig[] memory) {
    return new AuditConfig[](0);
  }

  /**
   * @dev default transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool) {
    if (super.transferInternal(_transferData)) {
      updateAuditInternal(_transferData, auditConfigs());
      return true;
    }
    return false;
  }

  /**
   * @dev Update audit data
   */
  function updateAuditInternal(
    TransferData memory _transferData,
    AuditConfig[] memory _auditConfigs) internal
  {
    for (uint256 i=0; i < _auditConfigs.length; i++) {
      AuditConfig memory auditConfig = _auditConfigs[i];

      /**** AUDIT STORAGE ****/
      AuditStorage storage auditStorage = (
        (auditConfig.scopeCore) ? audits[address(this)] : audits[_transferData.token]
      )[auditConfig.scopeId];

      /**** FILTERS ****/
      if (auditConfig.selectorSender && !auditStorage.selector[_transferData.sender]) {
        continue;
      }
      if (auditConfig.selectorReceiver && !auditStorage.selector[_transferData.receiver]) {
        continue;
      }

      /**** UPDATE AUDIT DATA ****/
      if (auditConfig.sharedData) {
        updateSenderAuditPrivate(auditStorage.sharedData, auditConfig, _transferData);
        updateReceiverAuditPrivate(auditStorage.sharedData, auditConfig, _transferData);
      }
      if (auditConfig.userData) {
        if (_transferData.senderId != 0) {
          updateSenderAuditPrivate(auditStorage.userData[_transferData.senderId], auditConfig, _transferData);
        }

        if (_transferData.receiverId != 0) {
          updateReceiverAuditPrivate(auditStorage.userData[_transferData.receiverId], auditConfig, _transferData);
        }
      }
      if (auditConfig.addressData) {
        updateSenderAuditPrivate(auditStorage.addressData[_transferData.sender], auditConfig, _transferData);
        updateReceiverAuditPrivate(auditStorage.addressData[_transferData.receiver], auditConfig, _transferData);
      }
    }
  }

  function updateSenderAuditPrivate(
    AuditData storage _senderAudit,
    AuditConfig memory _auditConfig,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_auditConfig.fieldCreatedAt && _senderAudit.createdAt == 0) {
      _senderAudit.createdAt = currentTime;
    }
    if (_auditConfig.fieldLastTransactionAt) {
      _senderAudit.lastTransactionAt = currentTime;
    }
    if (_auditConfig.fieldLastEmissionAt) {
      _senderAudit.lastEmissionAt = currentTime;
    }
    if (_auditConfig.fieldCumulatedEmission) {
      // may overflow
      _senderAudit.cumulatedEmission += (_auditConfig.scopeCore) ?
        _transferData.convertedValue : _transferData.value;
    }
  }

  function updateReceiverAuditPrivate(
    AuditData storage _receiverAudit,
    AuditConfig memory _auditConfig,
    TransferData memory _transferData
  ) private {
    uint64 currentTime = currentTime();
    if (_auditConfig.fieldCreatedAt && _receiverAudit.createdAt == 0) {
      _receiverAudit.createdAt = currentTime;
    }
    if (_auditConfig.fieldLastTransactionAt) {
      _receiverAudit.lastTransactionAt = currentTime;
    }
    if (_auditConfig.fieldLastReceptionAt) {
      _receiverAudit.lastReceptionAt = currentTime;
    }
    if (_auditConfig.fieldCumulatedReception) {
      // may overflow
      _receiverAudit.cumulatedReception += (_auditConfig.scopeCore) ?
        _transferData.convertedValue : _transferData.value;
    }
  }
}
