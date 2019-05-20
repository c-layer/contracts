pragma solidity >=0.5.0 <0.6.0;

import "./BaseToken.sol";
import "../ownership/Ownable.sol";
import "../interface/IIssuable.sol";


/**
 * @title IssuableToken
 * @dev BasicToken contract which implement an issuing mechanism.
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract IssuableToken is IIssuable, Ownable, BaseToken {

  // Overflow on attributes below is an expected behavior
  // The contract should not be locked because
  // the max uint256 value is reached
  // Usage of these values must handle the overflow
  uint256 public allTimeIssued = 0; // potential overflow
  uint256 public allTimeRedeemed = 0; // potential overflow

  /**
   * @dev called by the owner to increase the supply
   */
  function issue(uint256 _amount) public onlyOwner {
    balances[owner] = balances[owner].add(_amount);
    totalSupply_ = totalSupply_.add(_amount);

    allTimeIssued += _amount;
    emit Issued(_amount);
  }

  /**
   * @dev called by the owner to decrease the supply
   */
  function redeem(uint256 _amount) public onlyOwner {
    balances[owner] = balances[owner].sub(_amount);
    totalSupply_ = totalSupply_.sub(_amount);

    allTimeRedeemed += _amount;
    emit Redeemed(_amount);
  }

  event Issued(uint256 amount);
  event Redeemed(uint256 amount);
}
