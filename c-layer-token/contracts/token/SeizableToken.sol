pragma solidity >=0.5.0 <0.6.0;

import "./BaseToken.sol";
import "../ownership/Ownable.sol";
import "../interface/ISeizable.sol";


/**
 * @title SeizableToken
 * @dev Token which allows owner to seize accounts
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * ST01: Owner cannot seize itself
*/
contract SeizableToken is ISeizable, Ownable, BaseToken {
  using SafeMath for uint256;

  // Although very unlikely, the value below may overflow.
  // This contract and his childs should expect it to happened and consider
  // this value as only the first 256 bits of the complete value.
  uint256 public allTimeSeized = 0; // overflow may happend

  /**
   * @dev called by the owner to seize value from the account
   */
  function seize(address _account, uint256 _value)
    public onlyOwner
  {
    require(_account != owner, "ST01");

    balances[_account] = balances[_account].sub(_value);
    balances[owner] = balances[owner].add(_value);

    allTimeSeized += _value;
    emit Seize(_account, _value);
  }
}
