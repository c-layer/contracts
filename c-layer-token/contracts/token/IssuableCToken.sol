pragma solidity >=0.5.0 <0.6.0;

import "./IssuableToken.sol";
import "./CToken.sol";


/**
 * @title IssuableCToken
 * @dev IssuableCToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IssuableCToken is CToken, IssuableToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, uint256 _decimal)
    CToken(_name, _symbol, _decimal) public {}
}

