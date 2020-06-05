pragma solidity ^0.6.0;

import "../interface/IRule.sol";
import "./STransferData.sol";
import "../TokenStorage.sol";


/**
 * @title RuleEngineDelegate
 * @dev RuleEngineDelegate contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
abstract contract RuleEngineDelegate is TokenStorage {

  /**
   * @dev Define rules to the token
   */
  function defineRules(address _token, IRule[] memory _rules)
    public returns (bool)
  {
    tokens[_token].rules = _rules;
    emit RulesDefined(_token, _rules);
    return true;
  }

  /**
   * @dev Check if the rules are valid
   */
  function areTransferRulesValid(STransferData memory _transferData)
    internal view returns (bool)
  {
    IRule[] memory rules_ = tokens[_transferData.token].rules;
    for (uint256 i = 0; i < rules_.length; i++) {
      if (!rules_[i].isTransferValid(_transferData.sender, _transferData.receiver, _transferData.value)) {
        return false;
      }
    }
    return true;
  }
}
