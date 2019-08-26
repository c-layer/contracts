pragma solidity >=0.5.0 <0.6.0;

import "../storage/AuditableTokenStorage.sol";
import "./BaseTokenDelegate.sol";


/**
 * @title AuditableTokenDelegate
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 **/
contract AuditableTokenDelegate is BaseTokenDelegate, AuditableTokenStorage {

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    if (!super.transfer(_sender, _to, _value)) {
      return false;
    }
    updateAudit(_sender, _to, _value);
    return true;
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    if (!super.transferFrom(_sender, _from, _to, _value)) {
      return false;
    }

    updateAudit(_from, _to, _value);
    return true;
  }

  /**
   * @dev Update audit data
   */
  function updateAudit(address _sender, address _receiver, uint256 _value)
    private returns (uint256)
  {
    Audit storage senderAudit = audits[msg.sender][_sender];
    senderAudit.lastSentAt = currentTime();
    senderAudit.sentCount++;
    senderAudit.totalSentAmount += _value;
    if (senderAudit.createdAt == 0) {
      senderAudit.createdAt = currentTime();
    }

    Audit storage receiverAudit = audits[msg.sender][_receiver];
    receiverAudit.lastReceivedAt = currentTime();
    receiverAudit.receivedCount++;
    receiverAudit.totalReceivedAmount += _value;
    if (receiverAudit.createdAt == 0) {
      receiverAudit.createdAt = currentTime();
    }
  }
}
