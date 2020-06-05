pragma solidity ^0.6.0;

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

  uint256 constant AUDIT_CONFIGURATION_LIMITABLE_TRANSFERABILITY = 1;

  /**
   * @dev isTransferBelowLimits
   */
  function isTransferBelowLimits(STransferData memory _transferData)
    internal view returns (TransferCode code) {

    uint256 configurationId = delegatesConfigurations[proxyDelegateIds[_transferData.token]]
      [AUDIT_CONFIGURATION_LIMITABLE_TRANSFERABILITY];
    AuditConfiguration storage configuration_ = auditConfigurations[configurationId];

    if (!isAuditRequiredInternal(configuration_, _transferData)) {
      return TransferCode.OK;
    }

    fetchConvertedValue(_transferData, configuration_);
    if (_transferData.value != 0 && _transferData.convertedValue == 0) {
      return TransferCode.INVALID_RATE;
    }

    AuditStorage storage auditStorage = (
        (configuration_.scopeCore) ? audits[address(this)] : audits[_transferData.token]
      )[configuration_.scopeId];

    if (configuration_.fieldCumulatedEmission) {
      fetchSenderUser(_transferData, configuration_.senderKeys);
      if (_transferData.senderId == 0) {
        return TransferCode.NON_REGISTRED_SENDER;
      }

      if (auditStorage.userData[_transferData.senderId].cumulatedEmission.add(_transferData.convertedValue)
        > _transferData.senderKeys[SENDER_LIMIT_ID])
      {
        return TransferCode.LIMITED_EMISSION;
      }
    }

    if (configuration_.fieldCumulatedReception) {
      fetchReceiverUser(_transferData, configuration_.receiverKeys);
      if (_transferData.receiverId == 0) {
        return TransferCode.NON_REGISTRED_RECEIVER;
      }

      if (auditStorage.userData[_transferData.receiverId].cumulatedReception.add(_transferData.convertedValue)
        >  _transferData.receiverKeys[RECEIVER_LIMIT_ID])
      {  
         return TransferCode.LIMITED_RECEPTION;
      }
    }

    return TransferCode.OK;
  }
}
