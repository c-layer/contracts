pragma solidity >=0.5.0 <0.6.0;

import "../../Core.sol";
import "../storage/BaseTokenStorage.sol";


/**
 * @title IBaseTokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract IBaseTokenCore {

  function totalSupply() public view returns (uint256);
  function balanceOf(address _owner) public view returns (uint256);
  function allowance(address _owner, address _spender)
    public view returns (uint256);

  function transfer(address, address, uint256)
    public returns (bool status);
  function transferFrom(address, address, address, uint256)
    public returns (bool status);
  function approve(address, address, uint256)
    public returns (bool status);
  function increaseApproval(address, address, uint256)
    public returns (bool status);
  function decreaseApproval(address, address, uint256)
    public returns (bool status);
}
