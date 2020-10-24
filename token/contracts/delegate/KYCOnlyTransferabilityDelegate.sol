pragma solidity ^0.6.0;

import "./AuditableDelegate.sol";


/**
 * @title KYCOnlyTransferabilityDelegate
 * @dev KYCOnlyTransferabilityDelegate contract
 * This rule allow a legal authority to limite the transferability.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * LR01: The transfer constraints must remain valid
*/
contract KYCOnlyTransferabilityDelegate is AuditableDelegate {

  /**
   * @dev hasTransferValidUsers
   */
  function hasTransferValidUsers(STransferData memory _transferData,
    STransferAuditData memory _transferAuditData) internal view returns (TransferCode code)
  {
    if (_transferAuditData.senderAuditRequired) {
      fetchSenderUserId(_transferData);
      if (_transferData.senderId == 0) {
        return TransferCode.NON_REGISTRED_SENDER;
      }
    }

    if (_transferAuditData.receiverAuditRequired) {
      fetchReceiverUserId(_transferData);
      if (_transferData.receiverId == 0) {
        return TransferCode.NON_REGISTRED_RECEIVER;
      }
    }
    return TransferCode.OK;
  }
}
