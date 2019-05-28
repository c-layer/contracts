pragma solidity >=0.5.0 <0.6.0;

import "../util/governance/Operable.sol";
import "../interface/IWithRules.sol";
import "../interface/IRule.sol";


/**
 * @title WithRules
 * @dev WithRules contract allows inheriting contract to use a set of validation rules
 * @dev contract owner may add or remove rules
 *
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * @notice Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * @notice This content cannot be used, copied or reproduced in part or in whole
 * @notice without the express and written permission of Mt Pelerin Group SA.
 * @notice Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * @notice All matters regarding the intellectual property of this code or software
 * @notice are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 * Error messages
 * WR01: The rules rejected this address
 * WR02: The rules rejected the transfer
 **/
contract WithRules is IWithRules, Operable {

  IRule[] internal rules_;

  /**
   * @dev Constructor
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
  function validateAddress(address _address) public view returns (bool) {
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
  function validateTransfer(address _from, address _to, uint256 _amount)
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
   * @dev Modifier to make functions callable
   * only when participants follow rules
   */
  modifier whenAddressRulesAreValid(address _address) {
    require(validateAddress(_address), "WR01");
    _;
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

  /**
   * @dev Define rules to the token
   */
  function defineRules(IRule[] memory _rules) public onlyOperator {
    rules_ = _rules;
    emit RulesDefined();
  }
}
