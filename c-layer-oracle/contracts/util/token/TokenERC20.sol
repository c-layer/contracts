pragma solidity >=0.5.0 <0.6.0;

import "../math/SafeMath.sol";
import "./BaseToken.sol";


/**
 * @title Token ERC20 
 * @dev BaseToken with supplies
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract TokenERC20 is BaseToken {
  string internal name_;
  string internal symbol_;
  uint256 internal decimals_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public {
    name_ = _name;
    symbol_ = _symbol;
    decimals_ = _decimals;
    totalSupply_ = _initialSupply;
    balances[_initialAccount] = _initialSupply;
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
