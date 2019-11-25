pragma solidity >=0.5.0 <0.6.0;

import "./AuditableTokenDelegate.sol";


/**
 * @title LimitableTransferabilityTokenDelegate
 * @dev LimitableTransferabilityTokenDelegate contract
 * This rule allow a legal authority to limite the transferability.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * LR01: the transfer must stay below emission limit
 * LR02: the transfer must stay below reception limit
*/
contract LimitableTransferabilityTokenDelegate is AuditableTokenDelegate {

  /**
   * @dev Overriden transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    if (isAuditRequiredInternal(_transferData, 0)) {
      require(belowEmissionLimit(_transferData), "LR01");
      require(belowReceptionLimit(_transferData), "LR02");
    }
    return super.transferInternal(_transferData);
  }

  /**
   * @dev can transfer internal
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    if (isAuditRequiredInternal(_transferData, 0)) {
      if (!belowEmissionLimit(_transferData)) {
        return TransferCode.LIMITED_EMISSION;
      }

      if(!belowReceptionLimit(_transferData)) {
        return TransferCode.LIMITED_RECEPTION;
      }
    }
    return super.canTransferInternal(_transferData);
  }

  /**
   * @dev belowEmissionLimit
   */
  function belowEmissionLimit(TransferData memory _transferData) private view returns (bool) {
    fetchSenderUser(_transferData);
    if (_transferData.senderId != 0) {
      fetchConvertedValue(_transferData);
      if (_transferData.convertedValue != 0) {
        AuditStorage storage auditStorage = audits[address(this)][0];
        AuditData storage auditData = auditStorage.userData[_transferData.senderId];
        return auditData.cumulatedEmission.add(_transferData.convertedValue)
          <= _transferData.senderKeys[uint256(IUserRegistry.KeyCode.EMISSION_LIMIT_KEY)];
      }
    }
    
    return false;
  }

  /**
   * @dev belowReceptionLimit
   */
  function belowReceptionLimit(TransferData memory _transferData) private view returns (bool) {
    fetchReceiverUser(_transferData);
    if (_transferData.receiverId != 0) {
      fetchConvertedValue(_transferData);
      if (_transferData.convertedValue != 0) {
        AuditStorage storage auditStorage = audits[address(this)][0];
        AuditData storage auditData = auditStorage.userData[_transferData.receiverId];
        return auditData.cumulatedReception.add(_transferData.convertedValue)
          <= _transferData.receiverKeys[uint256(IUserRegistry.KeyCode.RECEPTION_LIMIT_KEY)];
      }
    }

    return false;
  }
}
