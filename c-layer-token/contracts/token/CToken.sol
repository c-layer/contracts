pragma solidity >=0.5.0 <0.6.0;

import "./SeizableToken.sol";
import "./TokenWithClaims.sol";
import "./TokenWithRules.sol";
import "../interface/IRule.sol";
import "../interface/IClaimable.sol";
import "../interface/IERC20.sol";


/**
 * @title CToken
 * @dev CToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract CToken is IERC20, TokenWithRules, TokenWithClaims, SeizableToken {

  string name_;
  string symbol_;
  uint256 decimal_;

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, uint256 _decimal)
    TokenWithRules(new IRule[](0)) TokenWithClaims(new IClaimable[](0)) public
  {
    name_ = _name;
    symbol_ = _symbol;
    decimal_ = _decimal;
  }

  function name() public view returns (string memory) {
    return name_;
  }

  function symbol() public view returns (string memory) {
    return symbol_;
  }

  function decimal() public view returns (uint256) {
    return decimal_;
  }
}
