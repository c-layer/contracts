pragma solidity >=0.5.0 <0.6.0;

import "../../Core.sol";
import "../storage/BaseTokenStorage.sol";
import "../interface/IBaseTokenCore.sol";


/**
 * @title BaseTokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract BaseTokenCore is IBaseTokenCore, Core, BaseTokenStorage {

  function transfer(address, address, uint256)
    public returns (bool status)
  {
    return delegateCall();
  }

  function transferFrom(address, address, address, uint256)
    public returns (bool status)
  {
    return delegateCall();
  }

  function approve(address, address, uint256)
    public returns (bool status)
  {
    return delegateCall();
  }

  function increaseApproval(address, address, uint256)
    public returns (bool status)
  {
    return delegateCall();
  }

  function decreaseApproval(address, address, uint256)
    public returns (bool status)
  {
    return delegateCall();
  }
}
