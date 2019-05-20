pragma solidity >=0.5.0 <0.6.0;

/**
 * @title IAuditable
 * @dev IAuditable interface describing the audited data
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 **/
contract IAuditable {
  function lastTransactionAt(address _address) public view returns (uint256);
  function lastReceivedAt(address _address) public view returns (uint256);
  function lastSentAt(address _address) public view returns (uint256);
  function transactionCount(address _address) public view returns (uint256);
  function receivedCount(address _address) public view returns (uint256);
  function sentCount(address _address) public view returns (uint256);
  function totalReceivedAmount(address _address) public view returns (uint256);
  function totalSentAmount(address _address) public view returns (uint256);
}
