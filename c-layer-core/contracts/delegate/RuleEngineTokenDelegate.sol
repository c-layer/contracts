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
   * @dev Overriden transferInternal function
   */
  function transferInternal(TransferData memory _transferData) internal
    whenTransferRulesAreValid(
      _transferData.sender,
      _transferData.receiver,
      _transferData.value) returns (bool)
  {
    return super.transferInternal(_transferData);
  }

  /**
   * @dev can transfer
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    address sender = _transferData.sender;
    address receiver = _transferData.receiver;
    uint256 value = _transferData.value;

    return validateTransfer(sender, receiver, value) ?
      super.canTransferInternal(_transferData): (TransferCode.RULE);
  }

  /**
   * @dev Define rules to the token
   */
  function defineRules(
    address _token, IRule[] memory _rules) public
  {
    tokens[_token].rules = _rules;
    emit RulesDefined(_token, _rules);
  }

  /**
   * @dev Check if the rules are valid for an address
   * @dev the rules array is unbounded and each claims
   * may have a complex gas cost estimate. Therefore it is left
   * to the token operators to ensure that the token remains always operable
   * with a transfer and transferFrom gas cost reasonable.
   */
  function validateAddress(address _token, address _address) public view returns (bool) {
    IRule[] memory rules_ = tokens[_token].rules;
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
    IRule[] memory rules_ = tokens[msg.sender].rules;
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
