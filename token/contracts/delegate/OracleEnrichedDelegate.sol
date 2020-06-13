pragma solidity ^0.6.0;

import "./STransferData.sol";
import "./STransferAuditData.sol";
import "../TokenStorage.sol";


/**
 * @title OracleEnrichedDelegate
 * @dev OracleEnrichedDelegate contract
 * @dev Enriched the transfer with oracle's informations
 * @dev needed for the delegate processing
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OracleEnrichedDelegate is TokenStorage {

  uint256 internal constant SENDER_LIMIT_ID = 0;
  uint256 internal constant RECEIVER_LIMIT_ID = 0;

  /**
   * @dev fetchSenderUser
   */
  function fetchSenderUser(STransferData memory _transferData,
     STransferAuditData memory _transferAuditData) internal view
  {
    if (!_transferData.senderFetched) {
      (_transferData.senderId, _transferData.senderKeys) =
        userRegistry_.validUser(_transferData.sender,
        auditConfigurations[_transferAuditData.auditConfigurationId].senderKeys);
      _transferData.senderFetched = true;
    }
  }

  /**
   * @dev fetchReceiverUser
   */
  function fetchReceiverUser(STransferData memory _transferData,
    STransferAuditData memory _transferAuditData) internal view
  {
    if (!_transferData.receiverFetched) {
      (_transferData.receiverId, _transferData.receiverKeys) =
        userRegistry_.validUser(_transferData.receiver,
        auditConfigurations[_transferAuditData.auditConfigurationId].receiverKeys);
      _transferData.receiverFetched = true;
    }
  }

  /**
   * @dev fetchConvertedValue
   * @dev warning: a converted value of 0 should be considered invalid
   * @dev it is left to the code calling this function to handle this case
   */
  function fetchConvertedValue(STransferData memory _transferData,
    STransferAuditData memory _transferAuditData) internal view
  {
    if (_transferData.convertedValue == 0 && _transferData.value != 0) {
      address currencyFrom = _transferData.token;
      _transferData.convertedValue = (
         _transferAuditData.currency != address(0) && currencyFrom != _transferAuditData.currency
      ) ? _transferAuditData.ratesProvider.convert(_transferData.value,
            bytes32(bytes20(currencyFrom)), bytes32(bytes20(_transferAuditData.currency))
          ) : _transferData.value;
    }
  }
}
