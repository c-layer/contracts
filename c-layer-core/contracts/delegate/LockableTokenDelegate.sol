pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";


/**
 * @title LockableTokenDelegate
 * @dev LockableTokenDelegate contract
 * This rule allows to lock assets for a period of time
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * LTD01: token is currently locked
 * LTD02: startAt must be before or equal to endAt
 */
contract LockableTokenDelegate is BaseTokenDelegate {

  /**
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(isUnlocked(_sender), "LTD01");
    return super.transfer(_sender, _to, _value);
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(isUnlocked(_from), "LTD01");
    return super.transferFrom(_sender, _from, _to, _value);
  }

  /**
   * @dev can transfer
   */
  function canTransfer(address _from, address _to, uint256 _value)
    public view returns (TransferCode)
  {
    return isUnlocked(_from) ?
      super.canTransfer(_from, _to, _value) : TransferCode.LOCKED;
  }

  /**
   * @dev define lock
   */
  function defineLock(
    address _token,
    uint256 _startAt,
    uint256 _endAt,
    address[] memory _exceptions) public returns (bool)
  {
    require(_startAt < _endAt, "LTD01");
    tokens_[_token].lock = Lock(_startAt, _endAt);
    Lock storage tokenLock = tokens_[_token].lock;
    for (uint256 i=0; i < _exceptions.length; i++) {
      tokenLock.exceptions[_exceptions[i]] = true;
    }
    emit LockDefined(_token, _startAt, _endAt, _exceptions);
    return true;
  }

  /**
   * @dev isUnlocked
   */
  function isUnlocked(address _sender) private view returns (bool) {
    Lock storage tokenLock = tokens_[msg.sender].lock;
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = now;
    return tokenLock.endAt <= currentTime
      || tokenLock.startAt > currentTime
      || tokenLock.exceptions[_sender];
  }
}
