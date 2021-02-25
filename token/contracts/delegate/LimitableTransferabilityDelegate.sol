pragma solidity ^0.8.0;

import "./AuditableDelegate.sol";


/**
 * @title LimitableTransferabilityDelegate
 * @dev LimitableTransferabilityDelegate contract
 * This rule allow a legal authority to limite the transferability.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messagesa
 * LR01: The transfer constraints must remain valid
*/
contract LimitableTransferabilityDelegate is AuditableDelegate {

  /**
   * @dev isTransferBelowLimits
   */
  function isTransferBelowLimits(STransferData memory _transferData,
      STransferAuditData memory _transferAuditData) internal view returns (TransferCode code)
  {
    if (!_transferAuditData.senderAuditRequired
      && !_transferAuditData.receiverAuditRequired)
    {
      return TransferCode.OK;
    }

    fetchConvertedValue(_transferData, _transferAuditData);
    if (_transferData.value != 0 && _transferData.convertedValue == 0) {
      return TransferCode.INVALID_RATE;
    }

    AuditStorage storage auditStorage = audits[address(this)][_transferAuditData.scopeId];

    if (_transferAuditData.senderAuditRequired) {
      fetchSenderUser(_transferData, _transferAuditData);
      if (_transferData.senderId == 0) {
        return TransferCode.NON_REGISTRED_SENDER;
      }

      if ((auditStorage.userData[_transferData.senderId].cumulatedEmission + _transferData.convertedValue)
        > _transferData.senderKeys[SENDER_LIMIT_ID])
      {
        return TransferCode.LIMITED_EMISSION;
      }
    }

    if (_transferAuditData.receiverAuditRequired) {
      fetchReceiverUser(_transferData, _transferAuditData);
      if (_transferData.receiverId == 0) {
        return TransferCode.NON_REGISTRED_RECEIVER;
      }

      if ((auditStorage.userData[_transferData.receiverId].cumulatedReception + _transferData.convertedValue)
        >  _transferData.receiverKeys[RECEIVER_LIMIT_ID])
      {  
         return TransferCode.LIMITED_RECEPTION;
      }
    }

    return TransferCode.OK;
  }
}
