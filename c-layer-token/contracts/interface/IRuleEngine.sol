pragma solidity >=0.5.0 <0.6.0;

import "./IRule.sol";


/**
 * @title IRuleEngine
 * @dev IRuleEngine interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract IRuleEngine {
  function rules() public view returns (IRule[] memory);
  function validateAddress(address _address) public view returns (bool);
  function validateTransfer(address _from, address _to, uint256 _amount)
    public view returns (bool);

  function defineRules(IRule[] memory _rules) public;

  event RulesDefined();
}
