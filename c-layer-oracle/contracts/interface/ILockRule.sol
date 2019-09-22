pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";


/**
 * @title ILockRule
 * @dev ILockRule interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract ILockRule is IRule {

  enum Direction {
    NONE,
    RECEIVE,
    SEND,
    BOTH
  }

  function hasSendDirection(Direction _direction) public pure returns (bool);
  function hasReceiveDirection(Direction _direction) public pure returns (bool);
  function restriction() public view returns (Direction);
  function scheduledStartAt() public view returns (uint256);
  function scheduledEndAt() public view returns (uint256);
  function isScheduleInverted() public view returns (bool);
  function isLocked() public view returns (bool);
  function individualPass(address _address) public view returns (Direction);
  function canSend(address _address) public view returns (bool);
  function canReceive(address _address) public view returns (bool);
  function definePass(
    address _address,
    Direction _restriction) public returns (bool);
  function defineManyPasses(
    address[] memory _addresses,
    Direction _restriction) public returns (bool);
  function scheduleLock(
    Direction _restriction,
    uint256 _startAt, uint256 _endAt, bool _scheduleInverted,
    address[] memory _passAddresses) public returns (bool);

  event LockDefinition(
    Direction restriction,
    uint256 startAt,
    uint256 endAt,
    bool scheduleInverted
  );
  event PassDefinition(address _address, Direction pass);
}
