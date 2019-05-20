pragma solidity >=0.5.0 <0.6.0;

import "./token/MintableCToken.sol";


/**
 * @title BondToken
 * @dev BondToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract BondToken is MintableCToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, uint256 _decimal) public
    MintableCToken(_name, _symbol, _decimal)
  {
  }
}

