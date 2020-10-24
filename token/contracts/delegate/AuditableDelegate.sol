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

  uint256 internal constant AUDIT_CONFIGURATION_LIMITABLE_TRANSFERABILITY = 0;

  /**
   * @dev prepareAuditInternal
   */
  function prepareAuditInternal(STransferData memory _transferData)
    internal view returns (STransferAuditData memory)
  {
    uint256 configurationId = delegatesConfigurations_[proxyDelegateIds[_transferData.token]
      ][AUDIT_CONFIGURATION_LIMITABLE_TRANSFERABILITY];
    AuditConfiguration storage configuration = auditConfigurations[configurationId];

    AuditTriggerMode mode = configuration.triggers[_transferData.sender][_transferData.receiver];
    if (mode == AuditTriggerMode.UNDEFINED) {
      mode = configuration.triggers[_transferData.sender][ANY_ADDRESSES];
    }
    if (mode == AuditTriggerMode.UNDEFINED) {
      mode = configuration.triggers[ANY_ADDRESSES][_transferData.receiver];
    }
    if (mode == AuditTriggerMode.UNDEFINED) {
      mode = configuration.triggers[ANY_ADDRESSES][ANY_ADDRESSES];
    }

    return STransferAuditData(
      configurationId,
      configuration.scopeId,
      audits[address(this)][configuration.scopeId].currency,
      configuration.ratesProvider,
      (mode == AuditTriggerMode.BOTH || mode == AuditTriggerMode.SENDER_ONLY),
      (mode == AuditTriggerMode.BOTH || mode == AuditTriggerMode.RECEIVER_ONLY)
    );
  }

  /**
   * @dev Update audit data
   */
  function updateAllAuditsInternal(STransferData memory _transferData,
    STransferAuditData memory _transferAuditData) internal returns (bool)
  {
    uint64 transactionAt = currentTime();
    audits[_transferData.token][uint256(Scope.DEFAULT)
      ].addressData[_transferData.sender].lastTransactionAt = transactionAt;
    audits[_transferData.token][uint256(Scope.DEFAULT)
      ].addressData[_transferData.sender].lastTransactionAt = transactionAt;

    if (_transferAuditData.senderAuditRequired || _transferAuditData.receiverAuditRequired) {
      fetchConvertedValue(_transferData, _transferAuditData);

      if (_transferAuditData.senderAuditRequired) {
        fetchSenderUser(_transferData, _transferAuditData);
        if (_transferData.senderId != 0) {
          AuditData storage senderAudit =
            audits[address(this)][_transferAuditData.scopeId].userData[_transferData.senderId];
          if (senderAudit.createdAt == 0) {
            senderAudit.createdAt = transactionAt;
          }

          senderAudit.cumulatedEmission =
            senderAudit.cumulatedEmission.add(_transferData.convertedValue);
        }
      }

      if (_transferAuditData.receiverAuditRequired) {
        fetchReceiverUser(_transferData, _transferAuditData);
        if (_transferData.receiverId != 0) {
          AuditData storage receiverAudit =
            audits[address(this)][_transferAuditData.scopeId].userData[_transferData.receiverId];
          if (receiverAudit.createdAt == 0) {
            receiverAudit.createdAt = transactionAt;
          }
          receiverAudit.cumulatedReception =
            receiverAudit.cumulatedReception.add(_transferData.convertedValue);
        }
      }
    }
    return true;
  }
}
