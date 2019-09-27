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
 */
contract OracleEnrichedTokenDelegate is BaseTokenDelegate {
  using BytesConvert for bytes;

  struct TransferDataConfig {
    bool callerId;
    bool callerKeys;
    bool senderId;
    bool senderKeys;
    bool receiverId;
    bool receiverKeys;
    bool convertedValue;
  }

  struct TransferData {
    address token;
    address caller;
    address sender;
    address receiver;

    uint256 callerId;
    uint256[] callerKeys;

    uint256 senderId;
    uint256[] senderKeys;

    uint256 receiverId;
    uint256[] receiverKeys;

    uint256 value;
    uint256 convertedValue;
  }

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _receiver, uint256 _value)
    public returns (bool)
  {
    return transferInternal(
      transferData(msg.sender, address(0), _sender, _receiver, _value,
        transferDataConfig()));
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(
    address _caller, address _sender, address _receiver, uint256 _value)
    public returns (bool)
  {
    return transferInternal(
      transferData(msg.sender, _caller, _sender, _receiver, _value,
        transferDataConfig()));
  }

  /**
   * @dev can transfer
   */
  function canTransfer(
    address _sender,
    address _receiver,
    uint256 _value) public view returns (TransferCode)
  {
    return canTransferInternal(
      transferData(msg.sender, address(0), _sender, _receiver, _value,
        transferDataConfig()));
  }

  /**
   * @dev base transfer data config
   * @dev define which fields must be loaded
   */
  function transferDataConfig() internal pure returns (TransferDataConfig memory) {
    return TransferDataConfig(false, false, false, false, false, false, false);
  }

  /**
   * @dev default transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    if (_transferData.caller == address(0)) {
      return super.transfer(
        _transferData.sender,
        _transferData.receiver,
        _transferData.value);
    } else {
      return super.transferFrom(
        _transferData.caller,
        _transferData.sender,
        _transferData.receiver,
        _transferData.value);
    }
  }

  /**
   * @dev default canTransfer internal function
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    return super.canTransfer(
      _transferData.sender,
      _transferData.receiver,
      _transferData.value);
  }

  /**
   * @dev transferData
   */
  function transferData(
    address _token,
    address _caller, address _sender, address _receiver,
    uint256 _value,
    TransferDataConfig memory _dataConfig
  ) internal view returns (TransferData memory) {
    uint256[] memory emptyArray = new uint256[](0);
    TransferData memory data = TransferData(
        _token,
        _caller,
        _sender,
        _receiver,
        0,
        emptyArray,
        0,
        emptyArray,
        0,
        emptyArray,
        _value,
        0
    );

    if (_dataConfig.callerKeys) {
      (data.callerId, data.callerKeys) = userRegistry.validUser(_caller, userKeys);
    } else {
      data.callerId = (_dataConfig.callerId) ? userRegistry.validUserId(_caller) : 0;
    }

    if (_dataConfig.senderKeys) {
      (data.senderId, data.senderKeys) = userRegistry.validUser(_sender, userKeys);
    } else {
      data.senderId = (_dataConfig.senderId) ? userRegistry.validUserId(_sender) : 0;
    }

    if (_dataConfig.receiverKeys) {
      (data.receiverId, data.receiverKeys) = userRegistry.validUser(_receiver, userKeys);
    } else {
      data.receiverId = (_dataConfig.receiverId) ? userRegistry.validUserId(_receiver) : 0;
    }

    if (_dataConfig.convertedValue && _value != 0) {
      TokenData memory token = tokens_[msg.sender];
      data.convertedValue = ratesProvider.convert(
        _value, bytes(token.symbol).toBytes32(), currency);
    }

    return data;
  }
}
