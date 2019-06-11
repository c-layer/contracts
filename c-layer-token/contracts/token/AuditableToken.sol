pragma solidity >=0.5.0 <0.6.0;

import "../interface/IAuditable.sol";
import "./BaseToken.sol";


/**
 * @title AuditableToken
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 **/
contract AuditableToken is IAuditable, BaseToken {

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
  mapping(address => Audit) internal audits;

  /**
   * @dev Time of the creation of the audit struct
   */
  function auditCreatedAt(address _address) public view returns (uint256) {
    return audits[_address].createdAt;
  }

  /**
   * @dev Time of the last transaction
   */
  function lastTransactionAt(address _address) public view returns (uint256) {
    return (audits[_address].lastReceivedAt > audits[_address].lastSentAt) ?
      audits[_address].lastReceivedAt : audits[_address].lastSentAt;
  }

  /**
   * @dev Time of the last received transaction
   */
  function lastReceivedAt(address _address) public view returns (uint256) {
    return audits[_address].lastReceivedAt;
  }

  /**
   * @dev Time of the last sent transaction
   */
  function lastSentAt(address _address) public view returns (uint256) {
    return audits[_address].lastSentAt;
  }

  /**
   * @dev Count of transactions
   */
  function transactionCount(address _address) public view returns (uint256) {
    return audits[_address].receivedCount + audits[_address].sentCount;
  }

  /**
   * @dev Count of received transactions
   */
  function receivedCount(address _address) public view returns (uint256) {
    return audits[_address].receivedCount;
  }

  /**
   * @dev Count of sent transactions
   */
  function sentCount(address _address) public view returns (uint256) {
    return audits[_address].sentCount;
  }

  /**
   * @dev All time received
   */
  function totalReceivedAmount(address _address)
    public view returns (uint256)
  {
    return audits[_address].totalReceivedAmount;
  }

  /**
   * @dev All time sent
   */
  function totalSentAmount(address _address) public view returns (uint256) {
    return audits[_address].totalSentAmount;
  }

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    if (!super.transfer(_to, _value)) {
      return false;
    }
    updateAudit(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool)
  {
    if (!super.transferFrom(_from, _to, _value)) {
      return false;
    }

    updateAudit(_from, _to, _value);
    return true;
  }

 /**
   * @dev currentTime()
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }

  /**
   * @dev Update audit data
   */
  function updateAudit(address _sender, address _receiver, uint256 _value)
    private returns (uint256)
  {
    Audit storage senderAudit = audits[_sender];
    senderAudit.lastSentAt = currentTime();
    senderAudit.sentCount++;
    senderAudit.totalSentAmount += _value;
    if (senderAudit.createdAt == 0) {
      senderAudit.createdAt = currentTime();
    }

    Audit storage receiverAudit = audits[_receiver];
    receiverAudit.lastReceivedAt = currentTime();
    receiverAudit.receivedCount++;
    receiverAudit.totalReceivedAmount += _value;
    if (receiverAudit.createdAt == 0) {
      receiverAudit.createdAt = currentTime();
    }
  }
}
