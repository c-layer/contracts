pragma solidity >=0.5.0 <0.6.0;

import "./SeizableToken.sol";
import "./TokenWithClaims.sol";
import "./TokenRuleEngine.sol";
import "../interface/IRule.sol";
import "../interface/IClaimable.sol";
import "../interface/IERC20.sol";


/**
 * @title CToken
 * @dev CToken contract
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract CToken is IERC20, TokenRuleEngine, TokenWithClaims, SeizableToken {

  string internal name_;
  string internal symbol_;
  uint256 internal decimals_ = 18;

  /**
   * @dev constructor
   */
  constructor(string memory _name, string memory _symbol, IRule[] memory _rules)
    public TokenRuleEngine(_rules) TokenWithClaims(new IClaimable[](0))
  {
    name_ = _name;
    symbol_ = _symbol;
  }

  function name() public view returns (string memory) {
    return name_;
  }

  function symbol() public view returns (string memory) {
    return symbol_;
  }

  function decimals() public view returns (uint256) {
    return decimals_;
  }
}
