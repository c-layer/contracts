pragma solidity >=0.5.0 <0.6.0;

import "./OperableToken.sol";
import "../rule/RuleEngine.sol";
import "../interface/IRule.sol";


/**
 * @title TokenRuleEngine
 * @dev TokenRuleEngine contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract TokenRuleEngine is RuleEngine, OperableToken {

  /**
   * @dev Constructor
   */
  constructor(IRule[] memory _rules)
    public RuleEngine(_rules) {} /* solhint-disable no-empty-blocks */
 
  /**
   * @dev Overriden transfer function
   */
  function transfer(address _to, uint256 _value)
    public whenTransferRulesAreValid(msg.sender, _to, _value)
    returns (bool)
  {
    return super.transfer(_to, _value);
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(address _from, address _to, uint256 _value)
    public whenTransferRulesAreValid(_from, _to, _value)
    whenAddressRulesAreValid(msg.sender)
    returns (bool)
  {
    return super.transferFrom(_from, _to, _value);
  }
}
