pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";
import "../TokenProxy.sol";


/**
 * @title SeizableTokenDelegate
 * @dev Token which allows owner to seize accounts
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * ST01: Transfer events must be generated
 * ST02: Operator cannot seize itself
*/
contract SeizableTokenDelegate is BaseTokenDelegate {

  /**
   * @dev called by the owner to seize value from the account
   */
  function seize(
    address _token,
    address _account,
    uint256 _amount) public returns (bool)
  {
    require(_account != msg.sender, "ST02");
    TokenData storage token = tokens_[_token];

    token.balances[_account] = token.balances[_account].sub(_amount);
    token.balances[msg.sender] = token.balances[msg.sender].add(_amount);
    token.allTimeSeized += _amount;

    require(
      TokenProxy(_token).emitTransfer(_account, msg.sender, _amount),
      "ST01");
    emit Seize(_token, _account, _amount);
    return true;
  }
}
