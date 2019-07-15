pragma solidity >=0.5.0 <0.6.0;

import "./BaseERC20.sol";
import "../interface/IERC20.sol";


/**
 * @title ERC20
 * @dev BaseERC20 with supplies
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract ERC20 is IERC20, BaseERC20 {

  string internal name_;
  string internal symbol_;
  uint256 internal decimal_ = 18;

  constructor(
    string memory _name,
    string memory _symbol,
    address _initialAccount,
    uint256 _initialSupply) public {
    name_ = _name;
    symbol_ = _symbol;
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
