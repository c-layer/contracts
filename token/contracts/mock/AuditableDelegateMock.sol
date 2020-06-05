pragma solidity ^0.6.0;

import "./DelegateMock.sol";
import "../delegate/AuditableDelegate.sol";


/**
 * @title AuditableDelegateMock
 * @dev AuditableDelegateMock contract
 * @dev Enriched the transfer with oracle's informations
 * @dev needed for the delegate processing
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract AuditableDelegateMock is AuditableDelegate, DelegateMock {

  /**
   * @dev assertIsAuditRequired
   */
  function assertIsAuditRequired(
    address _token, address _caller, address _sender, address _receiver,
    uint256 _value, uint256 _configurationId) public view returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);
    AuditConfiguration storage configuration =
      auditConfigurations[_configurationId];
    return isAuditRequiredInternal(configuration, transferData_);
  }

  /**
   * @dev Update audit data
   */
  function testUpdateAllAudits(
    address _token, address _caller, address _sender, address _receiver,
    uint256 _value, uint256[] memory _configurationIds) public returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    proxyDelegateIds[_token] = 1;
    delegatesConfigurations[1] = _configurationIds;
    
    updateAllAuditsInternal(transferData_);

    logTransferData(transferData_);
    logAllAuditsData(_configurationIds, transferData_);
    return true;
  }

  /**
   * @dev Update audit data
   */
  function testUpdateAudit(
    address _token, address _caller, address _sender, address _receiver,
    uint256 _value, uint256 _configurationId) public returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    proxyDelegateIds[_token] = 1;
    delegatesConfigurations[1].push(_configurationId);
    updateAuditInternal(_configurationId, transferData_);

    logTransferData(transferData_);
    logAuditData(_configurationId, transferData_);
    return true;
  }
}
