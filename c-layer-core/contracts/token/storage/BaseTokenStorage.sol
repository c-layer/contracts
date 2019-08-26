pragma solidity >=0.5.0 <0.6.0;

import "../../util/math/SafeMath.sol";
import "../../Storage.sol";


/**
 * @title BaseToken storage
 * @dev BaseToken storage
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract BaseTokenStorage is Storage {
  using SafeMath for uint256;

  struct BaseTokenData {
    uint256 totalSupply;
    mapping (address => uint256) balances;
    mapping (address => mapping (address => uint256)) allowed;
  }
  mapping (address => BaseTokenData) internal baseTokens;

  function totalSupply() public view returns (uint256) {
    return baseTokens[msg.sender].totalSupply;
  }

  function balanceOf(address _owner) public view returns (uint256) {
    return baseTokens[msg.sender].balances[_owner];
  }

  function allowance(address _owner, address _spender)
    public view returns (uint256)
  {
    return baseTokens[msg.sender].allowed[_owner][_spender];
  }

}
