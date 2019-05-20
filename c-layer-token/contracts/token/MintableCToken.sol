pragma solidity >=0.5.0 <0.6.0;

import "./CToken.sol";
import "./MintableToken.sol";


/**
 * @title MintableCToken
 * @dev MintableCToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract MintableCToken is CToken, MintableToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, uint256 _decimal)
    CToken(_name, _symbol, _decimal) public {}
}

