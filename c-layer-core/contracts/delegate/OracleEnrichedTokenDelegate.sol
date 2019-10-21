pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";
import "../util/convert/BytesConvert.sol";


/**
 * @title OracleEnrichedTokenDelegate
 * @dev OracleEnrichedTokenDelegate contract
 * @dev Enriched the transfer with oracle's informations
 * @dev needed for the delegate processing
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *  OET01: The rate is undefined or invalid
 */
contract OracleEnrichedTokenDelegate is BaseTokenDelegate {
  using BytesConvert for bytes;

  /**
   * @dev fetchCallerUser
   */
  function fetchCallerUser(TransferData memory _transferData) internal view {
    if (!_transferData.callerFetched) {
      (_transferData.callerId, _transferData.callerKeys) =
        userRegistry.validUser(_transferData.caller, userKeys);
      _transferData.callerFetched = true;
    }
  }

  /**
   * @dev fetchSenderUser
   */
  function fetchSenderUser(TransferData memory _transferData) internal view {
    if (!_transferData.senderFetched) {
      (_transferData.senderId, _transferData.senderKeys) =
        userRegistry.validUser(_transferData.sender, userKeys);
      _transferData.senderFetched = true;
    }
  }


  /**
   * @dev fetchReceiverUser
   */
  function fetchReceiverUser(TransferData memory _transferData) internal view {
    if (!_transferData.receiverFetched) {
      (_transferData.receiverId, _transferData.receiverKeys) =
        userRegistry.validUser(_transferData.receiver, userKeys);
      _transferData.receiverFetched = true;
    }
  }

  /**
   * @dev fetchConvertedValue
   */
  function fetchConvertedValue(TransferData memory _transferData) internal view {
    uint256 value = _transferData.value;
    if (_transferData.convertedValue == 0 && value != 0) {
      TokenData memory token = tokens_[_transferData.token];
      _transferData.convertedValue = ratesProvider.convert(
        value, bytes(token.symbol).toBytes32(), currency);
      require(_transferData.convertedValue != 0, "OET01");
    }
  }
}
