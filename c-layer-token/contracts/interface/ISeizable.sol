pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ISeizable
 * @dev ISeizable interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract ISeizable {
  function seize(address _account, uint256 _value) public;
  event Seize(address account, uint256 amount);
}
