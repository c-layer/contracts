pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";
import "./BaseTokenDelegate.sol";


/**
 * @title RuleEngineTokenDelegate
 * @dev RuleEngineTokenDelegate contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract RuleEngineTokenDelegate is BaseTokenDelegate {

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
    returns (bool)
  {
    return super.transferFrom(_sender, _from, _to, _value);
  }

  /**
   * @dev can transfer
   */
  function canTransfer(
    address _from,
    address _to,
    uint256 _value) public view returns (TransferCode)
  {
    return validateTransfer(_from, _to, _value) ?
      super.canTransfer(_from, _to, _value) : (TransferCode.RULE);
  }

  /**
   * @dev Define rules to the token
   */
  function defineRules(
    address _token, IRule[] memory _rules) public
  {
    tokens_[_token].rules = _rules;
    emit RulesDefined(_token, _rules);
  }

  /**
   * @dev Check if the rules are valid for an address
   */
  function validateAddress(address _token, address _address) public view returns (bool) {
    IRule[] memory rules_ = tokens_[_token].rules;
    for (uint256 i = 0; i < rules_.length; i++) {
      if (!rules_[i].isAddressValid(_address)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev Modifier to make functions callable
   * only when participants follow rules
   */
  modifier whenAddressRulesAreValid(address _address) {
    require(validateAddress(msg.sender, _address), "WR01");
    _;
  }

  /**
   * @dev Check if the rules are valid
   */
  function validateTransfer(address _from, address _to, uint256 _amount)
    public view returns (bool)
  {
    IRule[] memory rules_ = tokens_[msg.sender].rules;
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
