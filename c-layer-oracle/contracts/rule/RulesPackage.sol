pragma solidity >=0.5.0 <0.6.0;

import "../util/governance/Operable.sol";
import "../interface/IRule.sol";


/**
 * @title RulesPackage
 * @dev RulesPackage contract allows inheriting contract to use a set of validation rules
 * @dev contract owner may add or remove rules
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract RulesPackage is IRule, Operable {

  IRule[] internal rules_;

  /**
   * @dev constructor
   */
  constructor(IRule[] memory _rules) public {
    rules_ = _rules;
  }

  /**
   * @dev Returns the rules
   */
  function rules() public view returns (IRule[] memory) {
    return rules_;
  }

  /**
   * @dev Check if the rules are valid for an address
   */
  function isAddressValid(address _address) public view returns (bool) {
    for (uint256 i = 0; i < rules_.length; i++) {
      if (!rules_[i].isAddressValid(_address)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev Check if the rules are valid
   */
  function isTransferValid(address _from, address _to, uint256 _amount)
    public view returns (bool)
  {
    for (uint256 i = 0; i < rules_.length; i++) {
      if (!rules_[i].isTransferValid(_from, _to, _amount)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @dev Define rules to the token
   */
  function defineRules(IRule[] memory _rules) public onlyOperator {
    rules_ = _rules;
    emit RulesDefined(rules_.length);
  }

  event RulesDefined(uint256 count);
}
