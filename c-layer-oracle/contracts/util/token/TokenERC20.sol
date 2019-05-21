pragma solidity >=0.5.0 <0.6.0;

import "../math/SafeMath.sol";
import "./BaseToken.sol";


/**
 * @title Token ERC20 
 * @dev BaseToken with supplies
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract TokenERC20 is BaseToken {
  string internal name_;
  string internal symbol_;
  uint256 internal decimal_;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimal,
    address _initialAccount,
    uint256 _initialSupply
  ) public {
    name_ = _name;
    symbol_ = _symbol;
    decimal_ = _decimal;
    totalSupply_ = _initialSupply;
    balances[_initialAccount] = _initialSupply;
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
