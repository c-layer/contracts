pragma solidity ^0.8.0;

import "./interface/IFaucet.sol";
import "./vault/Vault.sol";


/**
 * @title Vault
 * @dev Vault
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   FC01: Withdrew value is higher than the limit
 *   FC02: Sender has already many tokens
 *   FC03: Sender has already received many tokens
 *   FC04: Sender is withdrawing tokens too fast
 */
contract Faucet is IFaucet, Vault {

  mapping(IERC20 => SWithdrawLimit) internal withdrawLimits;
  mapping(IERC20 => mapping(address => SWithdrawStatus)) internal withdrawStatus_;

  /**
   * @dev constructor
   */
  constructor(address _beneficiary) Vault(_beneficiary) {}

  /**
   * @dev withdrawLimit
   */
  function withdrawLimit(IERC20 _token)
    external override view returns (
      uint256 maxBalance,
      uint256 maxWithdrawOnce,
      uint256 maxWithdrawPeriod,
      uint256 maxWithdrawAllTime,
      uint256 period)
  {
    SWithdrawLimit memory limit = withdrawLimits[_token];
    return (
      limit.maxBalance,
      limit.maxWithdrawOnce,
      limit.maxWithdrawPeriod,
      limit.maxWithdrawAllTime,
      limit.period);
  }

  /**
   * @dev withdrawStatus
   */
  function withdrawStatus(IERC20 _token, address _beneficiary)
    external override view returns (
      uint256 allTimeDistributed,
      uint256 recentlyDistributed,
      uint64 lastAt)
  {
    SWithdrawStatus memory status =  withdrawStatus_[_token][_beneficiary];
    return (
      status.allTimeDistributed,
      status.recentlyDistributed,
      status.lastAt);
  }

  /**
   * @dev withdraw
   */
  function withdraw(IERC20 _token, uint256 _value) external override returns (bool) {
    return withdrawInternal(_token, payable(msg.sender), _value);
  }

  /**
   * @dev withdrawTo
   */
  function withdrawTo(IERC20 _token, address payable _to, uint256 _value)
    external override returns (bool)
  {
    return withdrawInternal(_token, _to, _value);
  }

  /**
   * @dev withdrawInternal
   */
  function withdrawInternal(IERC20 _token, address payable _to, uint256 _value)
    internal returns (bool)
  {
    if(!isOperator(msg.sender)) {
      SWithdrawLimit storage withdrawLimit_ = withdrawLimits[_token];
      withdrawLimit_ = (withdrawLimit_.maxBalance != 0) ?
        withdrawLimit_ : withdrawLimits[ALL_TOKENS];

      require(_value <= withdrawLimit_.maxWithdrawOnce, "FC01");

      uint256 recipientBalance =
        (address(_token) == address(0)) ? _to.balance : _token.balanceOf(_to);
      require(recipientBalance + _value <= withdrawLimit_.maxBalance, "FC02");

      SWithdrawStatus storage senderStatus = withdrawStatus_[_token][_to];
      senderStatus.allTimeDistributed = senderStatus.allTimeDistributed + _value;
      require(senderStatus.allTimeDistributed <= withdrawLimit_.maxWithdrawAllTime, "FC03");

      if(withdrawLimit_.period > 0) {
        uint256 currentTime_ = currentTime();
        uint256 timeDelta = (currentTime_ - senderStatus.lastAt);

        if(timeDelta < withdrawLimit_.period)  {
          uint256 recovery = timeDelta * withdrawLimit_.maxWithdrawPeriod / withdrawLimit_.period;

          senderStatus.recentlyDistributed = (senderStatus.recentlyDistributed <= recovery) ?
            0 :  senderStatus.recentlyDistributed - recovery;

          senderStatus.recentlyDistributed = senderStatus.recentlyDistributed + _value;
          require(senderStatus.recentlyDistributed <= withdrawLimit_.maxWithdrawPeriod, "FC04");
        } else {
          senderStatus.recentlyDistributed = _value;
        }

        senderStatus.lastAt = uint64(currentTime_);
      }
    }

    bool success;
    if(address(_token) == address(0)) {
      (success,) = transferInternal(_to, _value, "");
    } else {
      success =_token.transfer(_to, _value);
    }
    return success;
  }

  /*
   * @dev defineWithdrawLimit
   */
  function defineWithdrawLimit(
    IERC20 _token,
    uint256 _maxBalance,
    uint256 _maxWithdrawOnce,
    uint256 _maxWithdrawPeriod,
    uint256 _maxWithdrawAllTime,
    uint256 _period) external override onlyOperator returns (bool)
  {
    withdrawLimits[_token] = SWithdrawLimit(
      _maxBalance,
      _maxWithdrawOnce,
      _maxWithdrawPeriod,
      _maxWithdrawAllTime,
      _period);
    emit WithdrawLimitUpdate(
      _token,
      _maxBalance,
      _maxWithdrawOnce,
      _maxWithdrawPeriod,
      _maxWithdrawAllTime,
      _period);
    return true;
  }

  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
