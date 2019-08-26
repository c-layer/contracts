pragma solidity >=0.5.0 <0.6.0;

import "../storage/SeizableTokenStorage.sol";
import "./OperableTokenCore.sol";


/**
 * @title SeizableTokenCore
 * @dev Token which allows owner to seize accounts
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * ST01: Operator cannot seize itself
*/
contract SeizableTokenCore is OperableTokenCore, SeizableTokenStorage {

  /**
   * @dev called by the owner to seize value from the account
   */
  function seize(address _token, address _account, uint256 _value)
    public onlyOperator
  {
    require(_account != msg.sender, "ST01");

    BaseTokenData storage baseToken = baseTokens[_token];

    baseToken.balances[_account] = baseToken.balances[_account].sub(_value);
    baseToken.balances[msg.sender] = baseToken.balances[msg.sender].add(_value);

    allTimeSeized[_token] += _value;
    emit Seize(_token, _account, _value);
  }

  event Seize(address token, address account, uint256 amount);
}
