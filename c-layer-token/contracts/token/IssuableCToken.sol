pragma solidity >=0.5.0 <0.6.0;

import "./IssuableToken.sol";
import "./CToken.sol";


/**
 * @title IssuableCToken
 * @dev IssuableCToken contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract IssuableCToken is CToken, IssuableToken {

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, IRule[] memory _rules)
    public CToken(_name, _symbol, _rules)
    {} /* solhint-disable no-empty-blocks */
}

