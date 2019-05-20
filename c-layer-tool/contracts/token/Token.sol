pragma solidity >=0.5.0 <0.6.0;

import "../math/SafeMath.sol";
import "./BaseToken.sol";


/**
 * @title Token
 * @dev BaseToken with supplies
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract Token is BaseToken {

  constructor(address _initialAccount, uint256 _initialSupply) public {
    totalSupply_ = _initialSupply;
    balances[_initialAccount] = _initialSupply;
  }
}
