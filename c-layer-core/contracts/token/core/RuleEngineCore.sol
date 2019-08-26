pragma solidity >=0.5.0 <0.6.0;

import "../storage/RuleEngineStorage.sol";
import "./OperableCore.sol";
import "../interface/IRule.sol";


/**
 * @title RuleEngineCore
 * @dev RuleEngineCore contract allows inheriting contract to use a set of validation rules
 * @dev contract owner may add or remove rules
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * WR01: The rules rejected this address
 * WR02: The rules rejected the transfer
 **/
contract RuleEngineCore is OperableCore, RuleEngineStorage {
  /**
   * @dev Define rules to the token
   */
  function defineRules(
    address _proxy, IRule[] memory _rules) public onlyOperator
  {
    proxyRules[_proxy].rules = _rules;
    emit RulesDefined(_proxy);
  }

  event RulesDefined(address proxy);
}
