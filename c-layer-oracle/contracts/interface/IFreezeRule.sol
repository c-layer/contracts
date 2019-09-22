pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";


/**
 * @title IFreezeRule
 * @dev IFreezeRule contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract IFreezeRule is IRule {
  function isFrozen() public view returns (bool);
  function isAddressFrozen(address _address) public view returns (bool);
  function freezeAddress(address _address, uint256 _until) public returns (bool);
  function freezeManyAddresses(address[] memory _addresses, uint256 _until) public returns (bool);
  function freezeAll(uint256 _until) public returns (bool);
 
  event FreezeAll(uint256 until);
  event Freeze(address _address, uint256 until);
}
