pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenStorage.sol";
import "./RuleEngineStorage.sol";


/**
 * @title TokenRuleEngineStorage
 * @dev TokenRuleEngineStorage contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract TokenRuleEngineStorage is RuleEngineStorage, OperableTokenStorage {

  /**
   * @dev Check if the rules are valid
   */
  function validateTransfer(address _from, address _to, uint256 _amount)
    public view returns (bool)
  {
    IRule[] memory rules_ = proxyRules[msg.sender].rules;
    for (uint256 i = 0; i < rules_.length; i++) {
      if (!rules_[i].isTransferValid(_from, _to, _amount)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev Modifier to make transfer functions callable
   * only when participants follow rules
   */
  modifier whenTransferRulesAreValid(
    address _from,
    address _to,
    uint256 _amount)
  {
    require(validateTransfer(_from, _to, _amount), "WR02");
    _;
  }
}
