pragma solidity >=0.5.0 <0.6.0;

import "./token/MintableCToken.sol";


/**
 * @title EquityToken
 * @dev EquityToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract EquityToken is MintableCToken {

  // Equities are non divisible assets
  uint256 internal decimal_ = 0;

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, IRule[] memory _rules)
    public MintableCToken(_name, _symbol, _rules)
    {} /* solhint-disable no-empty-blocks */
}

