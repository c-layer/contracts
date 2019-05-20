pragma solidity >=0.5.0 <0.6.0;

import "./token/MintableCToken.sol";


/**
 * @title EquityToken
 * @dev EquityToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract EquityToken is MintableCToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol)
    MintableCToken(_name, _symbol, 0) public
  {
    // Equities are non divisible assets
  }
}

