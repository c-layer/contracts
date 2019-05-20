pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IIssuable
 * @dev IIssuable interface
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 **/
contract IIssuable {
  function issue(uint256 _amount) public;
  function redeem(uint256 _amount) public;
  event Issue(uint256 amount);
  event Redeem(uint256 amount);
}
