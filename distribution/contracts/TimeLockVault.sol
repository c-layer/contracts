pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "./interface/ITimeLockVault.sol";
import "./Vault.sol";


/**
 * @title TimeLockVault
 * @dev TimeLock Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract TimeLockVault is Vault, ITimeLockVault {
  using SafeMath for uint256;

  struct TimeLock {
    IERC20 token;
    uint64 start;
    uint64 end;

    UnlockMode mode;
    mapping(address => uint256) values;
    mapping(address => uint64) lastDistributions;
  }

  TimeLock internal timeLock_;

  function timeLock() public view override returns (
    IERC20 token, uint64 start, uint64 end, UnlockMode mode)
  {
    return (timeLock_.token, timeLock_.start, timeLock_.end, timeLock_.mode);
  }

  function distribution(address _recipient) public view override returns (
    uint256 value, uint256 availabe, uint64 lastDistribution)
  {
    return (timeLock_.values[_recipient],
      availableInternal(_recipient),
      timeLock_.lastDistributions[_recipient]);
  }

  function distribute() public override returns (bool) {
    uint256 value = availableInternal(msg.sender);
    require(value > 0, "TLV01");

    timeLock_.lastDistributions[msg.sender] = uint64(currentTime());
    timeLock_.values[msg.sender] = timeLock_.values[msg.sender].sub(value);

    require(timeLock_.token.transfer(msg.sender, value), "TLV02");

    emit Distribution(msg.sender, value);
    return true;
  }

  function defineTimeLock(
    IERC20 _token,
    uint64 _start,
    uint64 _end,
    UnlockMode _mode,
    address[] memory _recipients,
    uint256[] memory _values) public override returns (bool)
  {
    timeLock_ = TimeLock(_token, _start, _end, _mode);

    for(uint256 i=0; i < _recipients.length; i++) {
      timeLock_.values[_recipients[i]] = _values[i];
    }

    emit TimeLockDefined(_token, _start, _end, _mode, _recipients, _values);
    return true;
  }

  function availableInternal(address _recipient) internal view returns (uint256) {
    uint256 time = currentTime();
    if (timeLock_.mode == UnlockMode.AT_ONCE) {
      return (time < timeLock_.end) ? 0 : timeLock_.values[_recipient];
    }

    if (timeLock_.mode == UnlockMode.LINEAR) {
      uint256 begin = (timeLock_.lastDistributions[_recipient] < timeLock_.start) ?
        timeLock_.start : timeLock_.lastDistributions[_recipient];

      return (timeLock_.lastDistributions[_recipient] > timeLock_.end) ?
        timeLock_.values[_recipient] : (timeLock_.end - begin) / (timeLock_.end - begin) * timeLock_.values[_recipient];
    }
  }

  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
