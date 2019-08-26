pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenCore.sol";
import "../storage/IssuableTokenStorage.sol";


/**
 * @title IssuableTokenCore
 * @dev BasicToken contract which implement an issuing mechanism.
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract IssuableTokenCore is OperableTokenCore, IssuableTokenStorage {

  /**
   * @dev called by the owner to increase the supply
   */
  function issue(address _token, uint256 _amount) public onlyOperator {
    BaseTokenData storage baseToken = baseTokens[_token];

    baseToken.balances[owner] = baseToken.balances[owner].add(_amount);
    baseToken.totalSupply = baseToken.totalSupply.add(_amount);

    tokenIssuance[_token].allTimeIssued += _amount;
    emit Issued(_token, _amount);
  }

  /**
   * @dev called by the owner to decrease the supply
   */
  function redeem(address _token, uint256 _amount) public onlyOperator {
    BaseTokenData storage baseToken = baseTokens[_token];

    baseToken.balances[owner] = baseToken.balances[owner].sub(_amount);
    baseToken.totalSupply = baseToken.totalSupply.sub(_amount);

    tokenIssuance[_token].allTimeRedeemed += _amount;
    emit Redeemed(_token, _amount);
  }

  event Issued(address _token, uint256 amount);
  event Redeemed(address _token, uint256 amount);
}
