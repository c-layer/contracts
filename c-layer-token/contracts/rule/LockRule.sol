pragma solidity >=0.5.0 <0.6.0;

import "../ownership/Ownable.sol";
import "../interface/IRule.sol";


/**
 * @title LockRule
 * @dev LockRule contract
 * This rule allows to lock assets for a period of time
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * LOR01: startAt must be before or equal to endAt
 */
contract LockRule is IRule, Ownable {

  enum Direction {
    NONE,
    RECEIVE,
    SEND,
    BOTH
  }

  struct ScheduledLock {
    Direction restriction;
    uint256 startAt;
    uint256 endAt;
    bool scheduleInverted;
  }

  mapping(address => Direction) individualPasses;
  ScheduledLock lock = ScheduledLock(
    Direction.NONE,
    0,
    0,
    false
  );

  /**
   * @dev hasSendDirection
   */
  function hasSendDirection(Direction _direction) public pure returns (bool) {
    return _direction == Direction.SEND || _direction == Direction.BOTH;
  }

  /**
   * @dev hasReceiveDirection
   */
  function hasReceiveDirection(Direction _direction)
    public pure returns (bool)
  {
    return _direction == Direction.RECEIVE || _direction == Direction.BOTH;
  }

  /**
   * @dev restriction
   */
  function restriction() public view returns (Direction) {
    return lock.restriction;
  }

  /**
   * @dev scheduledStartAt
   */
  function scheduledStartAt() public view returns (uint256) {
    return lock.startAt;
  }

  /**
   * @dev scheduledEndAt
   */
  function scheduledEndAt() public view returns (uint256) {
    return lock.endAt;
  }

  /**
   * @dev lock inverted
   */
  function isScheduleInverted() public view returns (bool) {
    return lock.scheduleInverted;
  }

  /**
   * @dev isLocked
   */
  function isLocked() public view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return (lock.startAt <= now && lock.endAt > now)
      ? !lock.scheduleInverted : lock.scheduleInverted;
  }

  /**
   * @dev individualPass
   */
  function individualPass(address _address)
    public view returns (Direction)
  {
    return individualPasses[_address];
  }

  /**
   * @dev can the address send
   */
  function canSend(address _address) public view returns (bool) {
    if (isLocked() && hasSendDirection(lock.restriction)) {
      return hasSendDirection(individualPasses[_address]);
    }
    return true;
  }

  /**
   * @dev can the address receive
   */
  function canReceive(address _address) public view returns (bool) {
    if (isLocked() && hasReceiveDirection(lock.restriction)) {
      return hasReceiveDirection(individualPasses[_address]);
    }
    return true;
  }

  /**
   * @dev allow owner to provide a pass to an address
   */
  function definePass(address _address, uint256 _lock)
    public onlyOwner returns (bool)
  {
    individualPasses[_address] = Direction(_lock);
    emit PassDefinition(_address, Direction(_lock));
    return true;
  }

  /**
   * @dev allow owner to provide addresses with lock passes
   */
  function defineManyPasses(address[] memory _addresses, uint256 _lock)
    public onlyOwner returns (bool)
  {
    bool result = true;
    for (uint256 i = 0; i < _addresses.length && result; i++) {
      result = definePass(_addresses[i], _lock);
    }
    return result;
  }

  /**
   * @dev schedule lock
   */
  function scheduleLock(
    Direction _restriction,
    uint256 _startAt, uint256 _endAt, bool _scheduleInverted)
    public onlyOwner returns (bool)
  {
    require(_startAt <= _endAt, "LOR01");
    lock = ScheduledLock(
      _restriction,
      _startAt,
      _endAt,
      _scheduleInverted
    );
    emit LockDefinition(
      lock.restriction, lock.startAt, lock.endAt, lock.scheduleInverted);
  }

  /**
   * @dev validates an address
   */
  function isAddressValid(address /*_address*/) public view returns (bool) {
    return true;
  }

  /**
   * @dev validates a transfer of ownership
   */
  function isTransferValid(address _from, address _to, uint256 /* _amount */)
    public view returns (bool)
  {
    return (canSend(_from) && canReceive(_to));
  }

  event LockDefinition(
    Direction restriction,
    uint256 startAt,
    uint256 endAt,
    bool scheduleInverted
  );
  event PassDefinition(address _address, Direction pass);
}
