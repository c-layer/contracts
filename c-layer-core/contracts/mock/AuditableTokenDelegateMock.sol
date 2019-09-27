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
      _holdersId[1],
      _senderKeys,
      _holdersId[2],
      _receiverKeys,
      _values[0],
      _values[1]
    );
    AuditConfig[] memory definedAuditConfigs = auditConfigs();
    AuditConfig[] memory auditConfigs_ = new AuditConfig[](_configIds.length);
    for (uint256 i=0; i < _configIds.length; i++) {
      auditConfigs_[i] = definedAuditConfigs[_configIds[i]];
    }

    updateAuditInternal(transferData_, auditConfigs_);
    return true;
  }

  /**
   * @dev default audit data config
   */
  function auditConfigs() internal pure returns (AuditConfig[] memory) {
    AuditConfig[] memory auditConfigs_ = new AuditConfig[](4);
    auditConfigs_[0] = AuditConfig(
      0, true, // scopes
      true, true, true, // datas
      true, false, // selectors
      true, true, true, true, true, true // fields
    );
    auditConfigs_[1] = AuditConfig(
      1, true, // scopes
      true, false, false, // datas
      false, true, // selectors
      false, false, true, false, true, false // fields
    );
    auditConfigs_[2] = AuditConfig(
      2, true, // scopes
      false, false, true,
      true, true, //selectors
      true, true, false, false, false, false // fields
    );
    auditConfigs_[3] = AuditConfig(
      0, false, // scopes
      true, false, true, // datas
      false, false, // selectors
      true, true, true, true, true, true //fields
    );
    return auditConfigs_;
  }
}
