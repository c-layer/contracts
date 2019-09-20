pragma solidity >=0.5.0 <0.6.0;

import "./OperableToken.sol";
import "../interface/ISeizable.sol";


/**
 * @title SeizableToken
 * @dev Token which allows owner to seize accounts
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * ST01: Operator cannot seize itself
*/
contract SeizableToken is ISeizable, OperableToken {

  // Although very unlikely, the value below may overflow.
  // This contract and his childs should expect it to happened and consider
  // this value as only the first 256 bits of the complete value.
  uint256 public allTimeSeized = 0; // overflow may happend

  /**
   * @dev called by the owner to seize value from the account
   */
  function seize(address _account, uint256 _value)
    public onlyOperator
  {
    require(_account != msg.sender, "ST01");

    balances[_account] = balances[_account].sub(_value);
    balances[owner] = balances[owner].add(_value);

    allTimeSeized += _value;
    emit Seize(_account, _value);
  }
}
