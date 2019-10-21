pragma solidity >=0.5.0 <0.6.0;

import "./AuditableTokenDelegate.sol";


/**
 * @title LimitableReceptionTokenDelegate
 * @dev LimitableReceptionTokenDelegate contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * LR01: receiver must be registered
 */
contract LimitableReceptionTokenDelegate is AuditableTokenDelegate {

  uint256 constant private AML_LIMIT_KEY = 1;

  /**
   * @dev default audit data config
   */
  function auditConfigs() internal pure returns (AuditConfig[] memory) {
    AuditConfig[] memory auditConfigs_ = new AuditConfig[](1);
    auditConfigs_[0] = AuditConfig(
      0, true, // scopeId
      false, true, false, // userData
      true, false, // selectorSender
      false, false, false, false, false, true // only cumulated reception
    );
    return auditConfigs_;
  }

  /**
   * @dev Overriden transfer internal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    require(belowReceptionLimit(_transferData), "LR01");
    return super.transferInternal(_transferData);
  }

  /**
   * @dev can transfer internal
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    return belowReceptionLimit(_transferData) ?
      super.canTransferInternal(_transferData) : TransferCode.LIMITED_RECEPTION;
  }

  /**
   * @dev belowReceptionLimit
   */
  function belowReceptionLimit(TransferData memory _transferData) private view returns (bool) {
    AuditStorage storage auditStorage = audits[address(this)][0];
    if (!auditStorage.selector[_transferData.sender]) {
      return true;
    }

    fetchReceiverUser(_transferData);
    fetchConvertedValue(_transferData);
    require(_transferData.receiverId != 0, "LR01");
    AuditData memory auditData = auditStorage.userData[_transferData.receiverId];
    return auditData.cumulatedReception.add(_transferData.convertedValue)
      <= _transferData.receiverKeys[AML_LIMIT_KEY];
  }
}
