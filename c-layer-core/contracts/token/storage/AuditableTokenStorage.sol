pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenStorage.sol";


/**
 * @title AuditableTokenStorage
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 **/
contract AuditableTokenStorage is OperableTokenStorage {

   // Although very unlikely, the following values below may overflow:
   //   receivedCount, sentCount, totalReceivedAmount, totalSentAmount
   // This contract and his childs should expect it to happened and consider
   // these values as only the first 256 bits of the complete value.
  struct Audit {
    uint256 createdAt;
    uint256 lastReceivedAt;
    uint256 lastSentAt;
    uint256 receivedCount; // potential overflow
    uint256 sentCount; // poential overflow
    uint256 totalReceivedAmount; // potential overflow
    uint256 totalSentAmount; // potential overflow
  }
  mapping (address => mapping(address => Audit)) internal audits;

  /**
   * @dev Time of the creation of the audit struct
   */
  function auditCreatedAt(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].createdAt;
  }

  /**
   * @dev Time of the last transaction
   */
  function lastTransactionAt(address _token, address _address) public view returns (uint256) {
    return (audits[_token][_address].lastReceivedAt > audits[_token][_address].lastSentAt) ?
      audits[_token][_address].lastReceivedAt : audits[_token][_address].lastSentAt;
  }

  /**
   * @dev Time of the last received transaction
   */
  function lastReceivedAt(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].lastReceivedAt;
  }

  /**
   * @dev Time of the last sent transaction
   */
  function lastSentAt(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].lastSentAt;
  }

  /**
   * @dev Count of transactions
   */
  function transactionCount(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].receivedCount + audits[_token][_address].sentCount;
  }

  /**
   * @dev Count of received transactions
   */
  function receivedCount(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].receivedCount;
  }

  /**
   * @dev Count of sent transactions
   */
  function sentCount(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].sentCount;
  }

  /**
   * @dev All time received
   */
  function totalReceivedAmount(address _token, address _address)
    public view returns (uint256)
  {
    return audits[_token][_address].totalReceivedAmount;
  }

  /**
   * @dev All time sent
   */
  function totalSentAmount(address _token, address _address) public view returns (uint256) {
    return audits[_token][_address].totalSentAmount;
  }

  /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
