pragma solidity ^0.8.0;

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
   * @dev testPrepareAudit
   */
  function testPrepareAudit(address _token, address _caller,
     address _sender, address _receiver, uint256 _value,
     uint256[] memory _configurationIds) public returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    proxyDelegateIds[_token] = 1;
    delegatesConfigurations_[1] = _configurationIds;

    STransferAuditData memory transferAuditData = prepareAuditInternal(transferData_);
    
    logTransferAuditData(transferAuditData);
    return true;
  }

  /**
   * @dev Update all audit data
   */
  function testUpdateAllAudits(
    address _token, address _caller, address _sender, address _receiver,
    uint256 _value, uint256[] memory _configurationIds) public returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    proxyDelegateIds[_token] = 1;
    delegatesConfigurations_[1] = _configurationIds;

    updateAllAuditsInternal(transferData_,
      prepareAuditInternal(transferData_));

    logTransferData(transferData_);
    logAllAuditsData(_configurationIds, transferData_);
    return true;
  }
}
