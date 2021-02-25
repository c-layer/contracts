pragma solidity ^0.8.0;

import "../delegate/RuleEngineDelegate.sol";
import "./DelegateMock.sol";


/**
 * @title RuleEngineDelegateMock
 * @dev RuleEngineDelegateMock contract
 * This rule engine allow to enforce freeze of assets
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract RuleEngineDelegateMock is RuleEngineDelegate, DelegateMock {

  /**
   * @dev testAreTransferRulesValid
   */
  function testAreTransferRulesValid(address _token,
    address _caller, address _sender, address _receiver,
    uint256 _value) public view returns (bool)
  {
    STransferData memory transferData_ = transferData(
      _token, _caller, _sender, _receiver, _value);

    return areTransferRulesValid(transferData_);
  }
}
