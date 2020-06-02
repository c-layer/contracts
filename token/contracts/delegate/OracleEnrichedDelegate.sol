pragma solidity ^0.6.0;

import "@c-layer/common/contracts/convert/BytesConvert.sol";
import "./STransferData.sol";
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
  using BytesConvert for bytes;

  uint256 constant SENDER_LIMIT_ID = 0;
  uint256 constant RECEIVER_LIMIT_ID = 0;

  /**
   * @dev fetchSenderUser
   */
  function fetchSenderUser(STransferData memory _transferData,
    uint256[] memory _userKeys) internal view
  {
    if (!_transferData.senderFetched) {
      (_transferData.senderId, _transferData.senderKeys) =
        userRegistry_.validUser(_transferData.sender, _userKeys);
      _transferData.senderFetched = true;
    }
  }

  /**
   * @dev fetchReceiverUser
   */
  function fetchReceiverUser(STransferData memory _transferData,
    uint256[] memory _userKeys) internal view
  {
    if (!_transferData.receiverFetched) {
      (_transferData.receiverId, _transferData.receiverKeys) =
        userRegistry_.validUser(_transferData.receiver, _userKeys);
      _transferData.receiverFetched = true;
    }
  }

  /**
   * @dev fetchConvertedValue
   * @dev warning: a converted value of 0 should be considered invalid
   * @dev it is left to the code calling this function to handle this case
   */
  function fetchConvertedValue(STransferData memory _transferData,
    IRatesProvider _ratesProvider,
    bytes32 _currency) internal view
  {
    if (_transferData.convertedValue == 0 && _transferData.value != 0) {
      TokenData memory token = tokens[_transferData.token];
      bytes32 currencyFrom = bytes(token.symbol).toBytes32();

      _transferData.convertedValue = (currencyFrom != _currency) ?
         _ratesProvider.convert(_transferData.value, currencyFrom, _currency) : _transferData.value;
    }
  }
}
