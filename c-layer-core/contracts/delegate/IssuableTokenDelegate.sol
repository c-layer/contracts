pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";
import "../TokenProxy.sol";


/**
 * @title IssuableTokenDelegate
 * @dev BasicToken contract which implement an issuing mechanism.
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * IT01: Transfer events must be generated
 */
contract IssuableTokenDelegate is BaseTokenDelegate {

  /**
   * @dev called by the owner to increase the supply
   */
  function issue(address _token, uint256 _amount)
    public returns (bool)
  {
    TokenData storage token = tokens_[_token];
    token.balances[msg.sender] = token.balances[msg.sender].add(_amount);
    token.totalSupply = token.totalSupply.add(_amount);
    token.allTimeIssued += _amount;

    require(
      TokenProxy(_token).emitTransfer(address(0), msg.sender, _amount),
      "IT01");
    emit Issue(_token, _amount);
    return true;
  }

  /**
   * @dev called by the owner to decrease the supply
   */
  function redeem(address _token, uint256 _amount)
    public returns (bool)
  {
    TokenData storage token = tokens_[_token];
    token.balances[msg.sender] = token.balances[msg.sender].sub(_amount);
    token.totalSupply = token.totalSupply.sub(_amount);
    token.allTimeRedeemed += _amount;

    require(
      TokenProxy(_token).emitTransfer(msg.sender, address(0), _amount),
      "IT01");
    emit Redeem(_token, _amount);
    return true;
  }
}
