pragma solidity ^0.6.0;

import "../delegate/BaseTokenDelegate.sol";
import "../delegate/OracleEnrichedDelegate.sol";


/**
 * @title OracleEnrichedDelegateMock
 * @dev OracleEnrichedDelegateMock contract
 * @dev Enriched the transfer with oracle's informations
 * @dev needed for the delegate processing
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OracleEnrichedDelegateMock is OracleEnrichedDelegate, BaseTokenDelegate {

   /**
   * @dev defineOraclesMock
    */
  function defineOracleMock(IUserRegistry _userRegistry) public returns (bool)
  {
    userRegistry_ = _userRegistry;
  }

  /**
   * @dev testFetchSenderUser
   */
  function testFetchSenderUser(address _sender, uint256[] memory _userKeys)
    public view returns (uint256, uint256[] memory, bool)
  {
    STransferData memory transferData_ = transferData(
      address(0), address(0), _sender, address(0), 0);

    super.fetchSenderUser(transferData_, _userKeys);
    return (transferData_.senderId, transferData_.senderKeys, transferData_.senderFetched);
  }

  /**
   * @dev testFetchReceiverUser
   */
  function testFetchReceiverUser(address _receiver, uint256[] memory _userKeys)
    public view returns (uint256, uint256[] memory, bool)
  {
    STransferData memory transferData_ = transferData(
      address(0), address(0), address(0), _receiver, 0);

    super.fetchReceiverUser(transferData_, _userKeys);
    return (transferData_.receiverId, transferData_.receiverKeys, transferData_.receiverFetched);
  }

  /**
   * @dev testFetchConvertedValue
   */
  function testFetchConvertedValue(
    uint256 _value,
    IRatesProvider _ratesProvider,
    bytes32 _currency) public view returns (uint256)
  {
    STransferData memory transferData_ = transferData(
      address(0), address(0), address(0), address(0), _value);

    super.fetchConvertedValue(transferData_, _ratesProvider, _currency);
    return (transferData_.convertedValue);
  }
}
