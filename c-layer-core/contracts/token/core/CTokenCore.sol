pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenCore.sol";
import "../storage/CTokenStorage.sol";


/**
 * @title CTokenCore
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract CTokenCore is BaseTokenCore, CTokenStorage {

  function defineCToken(
    address _proxy,
    address _delegate,
    string memory _name,
    string memory _symbol,
    uint256 _decimals) public returns (bool)
  {
    if (defineProxyDelegate(_proxy, _delegate)) {
      ctoken[_proxy].name = _name;
      ctoken[_proxy].symbol = _symbol;
      ctoken[_proxy].decimals = _decimals;
      return true;
    }
    return false;
  }
}
