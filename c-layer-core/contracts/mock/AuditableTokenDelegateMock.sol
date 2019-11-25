pragma solidity >=0.5.0 <0.6.0;

import "../delegate/AuditableTokenDelegate.sol";


/**
 * @title AuditableTokenDelegateMock
 * @dev Auditable delegate token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 * The Mock allows to edit audit configuration which otherwise
 * is hardocded into the contract through inheritance and function overriding
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract AuditableTokenDelegateMock is AuditableTokenDelegate {

  /**
   * @dev Update audit data
   */
  function updateAuditMock(
    address _token,
    address[] memory _holders,
    uint256[] memory _holdersId,
    uint256[] memory _callerKeys,
    uint256[] memory _senderKeys,
    uint256[] memory _receiverKeys,
    uint256[] memory _values,
    uint256[] memory _configIds) public returns (bool)
  {
    TransferData memory transferData_ = TransferData(
      _token,
      _holders[0],
      _holders[1],
      _holders[2],
      _holdersId[0],
      _callerKeys,
      true,
      _holdersId[1],
      _senderKeys,
      true,
      _holdersId[2],
      _receiverKeys,
      true,
      _values[0],
      _values[1]
    );
    AuditConfiguration[] memory definedAuditConfigurations = defaultAuditConfigurations();
    AuditConfiguration[] memory auditConfigurations_ = new AuditConfiguration[](_configIds.length);
    for (uint256 i=0; i < _configIds.length; i++) {
      auditConfigurations_[i] = definedAuditConfigurations[_configIds[i]];
    }

    updateAuditInternal(transferData_);
    return true;
  }

  /**
   * @dev default audit data config
   */
  function defaultAuditConfigurations() internal pure returns (AuditConfiguration[] memory) {
    AuditConfiguration[] memory auditConfigurations_ = new AuditConfiguration[](4);
    auditConfigurations_[0] = AuditConfiguration(
      AuditMode.TRIGGERS_ONLY,
      0, true, // scopes
      true, true, true, // datas
      true, true, true, true, true, true // fields
    );
    auditConfigurations_[1] = AuditConfiguration(
      AuditMode.TRIGGERS_EXCLUDED,
      1, true, // scopes
      true, false, false, // datas
      false, false, true, false, true, false // fields
    );
    auditConfigurations_[2] = AuditConfiguration(
      AuditMode.ALWAYS,
      2, true, // scopes
      false, false, true,
      true, true, false, false, false, false // fields
    );
    auditConfigurations_[3] = AuditConfiguration(
      AuditMode.NEVER,
      0, false, // scopes
      true, false, true, // datas
      true, true, true, true, true, true //fields
    );
    return auditConfigurations_;
  }
}
