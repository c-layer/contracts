pragma solidity >=0.5.0 <0.6.0;

import "../delegate/OracleEnrichedTokenDelegate.sol";


/**
 * @title OracleEnrichedTokenDelegateMock
 * @dev OracleEnrichedTokenDelegateMock contract
 * @dev Enriched the transfer with oracle's informations
 * @dev needed for the delegate processing
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OracleEnrichedTokenDelegateMock is OracleEnrichedTokenDelegate {

  /**
   * @dev defineOraclesMock
   */
  function defineOraclesMock(
    IUserRegistry _userRegistry, IRatesProvider _ratesProvider, uint256[] memory _userKeys)
    public returns (bool)
  {
    userRegistry = _userRegistry;
    ratesProvider = _ratesProvider;
    userKeys = _userKeys;
  }

  /**
   * @dev read transfer data function
   */
  function readTransferDataMock(
    address _token,
    address[] memory _holders,
    uint256 _value,

    bool[] memory _config) public view returns (address[] memory, uint256[] memory)
  {
    TransferDataConfig memory transferDataConfig_ = TransferDataConfig(
      _config[0], _config[1], _config[2], _config[3], _config[4], _config[5], _config[6]);
    TransferData memory transferData_ =
      transferData(_token, _holders[0], _holders[1], _holders[2], _value, transferDataConfig_);

    address[] memory addresses = new address[](4);
    addresses[0] = transferData_.token;
    addresses[1] = transferData_.caller;
    addresses[2] = transferData_.sender;
    addresses[3] = transferData_.receiver;

    uint256 length = 5
      + transferData_.callerKeys.length
      + transferData_.senderKeys.length
      + transferData_.receiverKeys.length;
    uint256[] memory values = new uint256[](length);

    values[0] = transferData_.callerId;
    values[1] = transferData_.senderId;
    values[2] = transferData_.receiverId;
    values[3] = transferData_.value;
    values[4] = transferData_.convertedValue;

    uint256 j=5;
    for (uint256 i=0; i < transferData_.callerKeys.length; i++) {
      values[j++] = transferData_.callerKeys[i];
    }

    for (uint256 i=0; i < transferData_.senderKeys.length; i++) {
      values[j++] = transferData_.senderKeys[i];
    }

    for (uint256 i=0; i < transferData_.receiverKeys.length; i++) {
      values[j++] = transferData_.receiverKeys[i];
    }

    return (addresses, values);
  }

  /**
   * @dev base transfer data config
   * @dev define which fields must be loaded
   */
  function transferDataConfig() internal pure returns (TransferDataConfig memory) {
    return TransferDataConfig(true, true, true, true, true, true, true);
  }
}
