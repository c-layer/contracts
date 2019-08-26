pragma solidity >=0.5.0 <0.6.0;

import "./OperableStorage.sol";
import "../interface/IRule.sol";


/**
 * @title RuleEngineStorage
 * @dev RuleEngineStorage contract allows inheriting contract to use a set of validation rules
 * @dev contract owner may add or remove rules
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract RuleEngineStorage is OperableStorage {

  struct RuleData {
    IRule[] rules;
  }
  mapping (address => RuleData) internal proxyRules;

  /**
   * @dev Returns the rules
   */
  function rules(address _proxy) public view returns (IRule[] memory) {
    return proxyRules[_proxy].rules;
  }

  /**
   * @dev Check if the rules are valid for an address
   */
  function validateAddress(address _proxy, address _address) public view returns (bool) {
    IRule[] memory rules_ = proxyRules[_proxy].rules;
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
}
