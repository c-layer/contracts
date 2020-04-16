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
  function defineOracleMock(IUserRegistry _userRegistry) public returns (bool)
  {
    userRegistry = _userRegistry;
  }

  /**
   * @dev testFetchCallerUser
   */
  function testFetchCallerUser(address _caller, uint256[] memory _userKeys)
    public view returns (uint256, uint256[] memory, bool)
  {
    TransferData memory transferData = transferData(
      address(0), _caller, address(0), address(0), 0);

    super.fetchCallerUser(transferData, _userKeys);
    return (transferData.callerId, transferData.callerKeys, transferData.callerFetched);
  }

  /**
   * @dev testFetchSenderUser
   */
  function testFetchSenderUser(address _sender, uint256[] memory _userKeys)
    public view returns (uint256, uint256[] memory, bool)
  {
    TransferData memory transferData = transferData(
      address(0), address(0), _sender, address(0), 0);

    super.fetchSenderUser(transferData, _userKeys);
    return (transferData.senderId, transferData.senderKeys, transferData.senderFetched);
  }

  /**
   * @dev testFetchReceiverUser
   */
  function testFetchReceiverUser(address _receiver, uint256[] memory _userKeys)
    public view returns (uint256, uint256[] memory, bool)
  {
    TransferData memory transferData = transferData(
      address(0), address(0), address(0), _receiver, 0);

    super.fetchReceiverUser(transferData, _userKeys);
    return (transferData.receiverId, transferData.receiverKeys, transferData.receiverFetched);
  }

  /**
   * @dev testFetchConvertedValue
   */
  function testFetchConvertedValue(
    uint256 _value,
    IRatesProvider _ratesProvider,
    bytes32 _currency) public view returns (uint256)
  {
    TransferData memory transferData = transferData(
      address(0), address(0), address(0), address(0), _value);

    super.fetchConvertedValue(transferData, _ratesProvider, _currency);
    return (transferData.convertedValue);
  }
}
