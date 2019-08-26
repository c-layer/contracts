pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenStorage.sol";


/**
 * @title CToken storage
 * @dev CToken storage
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract CTokenStorage is BaseTokenStorage {

  struct CTokenData {
    string name;
    string symbol;
    uint256 decimals;
  }
  mapping (address => CTokenData) internal ctoken;

  function name() public view returns (string memory) {
    return ctoken[msg.sender].name;
  }

  function symbol() public view returns (string memory) {
    return ctoken[msg.sender].symbol;
  }

  function decimals() public view returns (uint256) {
    return ctoken[msg.sender].decimals;
  }
}
