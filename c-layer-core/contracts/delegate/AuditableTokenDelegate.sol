pragma solidity >=0.5.0 <0.6.0;

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
contract AuditableTokenDelegate is BaseTokenDelegate {

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(super.transfer(_sender, _to, _value));
    updateAudit(_sender, _to, _value);
    return true;
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(super.transferFrom(_sender, _from, _to, _value));
    updateAudit(_from, _to, _value);
    return true;
  }

  /**
   * @dev Update audit data
   */
  function updateAudit(address _sender, address _receiver, uint256 _value)
    private returns (uint256)
  {
    // Token audits
    AuditData storage senderTokenAudit = tokens_[msg.sender].audits[_sender];
    senderTokenAudit.lastTransactionAt = currentTime();
    senderTokenAudit.sentAmount += _value;
    if (senderTokenAudit.createdAt == 0) {
      senderTokenAudit.createdAt = currentTime();
    }

    AuditData storage receiverTokenAudit = tokens_[msg.sender].audits[_receiver];
    receiverTokenAudit.lastTransactionAt = currentTime();
    receiverTokenAudit.receivedAmount += _value;
    if (receiverTokenAudit.createdAt == 0) {
      receiverTokenAudit.createdAt = currentTime();
    }
  }
}
