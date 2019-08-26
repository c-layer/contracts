pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";
import "../storage/TokenRuleEngineStorage.sol";
import "./BaseTokenDelegate.sol";


/**
 * @title TokenRuleEngineDelegate
 * @dev TokenRuleEngineDelegate contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract TokenRuleEngineDelegate is TokenRuleEngineStorage, BaseTokenDelegate {

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public whenTransferRulesAreValid(_sender, _to, _value)
    returns (bool)
  {
    return super.transfer(_sender, _to, _value);
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public whenTransferRulesAreValid(_from, _to, _value)
    whenAddressRulesAreValid(_sender)
    returns (bool)
  {
    return super.transferFrom(_sender, _from, _to, _value);
  }
}
