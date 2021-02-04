pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
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
 *   FC03: Sender is withdrawing tokens too fast
 */
contract Faucet is IFaucet, Vault {
  using SafeMath for uint256;

  mapping(IERC20 => SWithdrawLimit) internal withdrawLimits;
  mapping(IERC20 => mapping(address => SWithdrawStatus)) internal withdrawStatus_;

  /**
   * @dev constructor
   */
  constructor(address _beneficiary) public Vault(_beneficiary) {}

  /**
   * @dev withdrawLimit
   */
  function withdrawLimit(IERC20 _token)
    external override view returns (uint256 maxBalance, uint256 period)
  {
    SWithdrawLimit memory limit = withdrawLimits[_token];
    return (limit.maxBalance, limit.period);
  }

  /**
   * @dev withdrawStatus
   */
  function withdrawStatus(IERC20 _token, address _beneficiary)
    external override view returns (uint256 recentlyDistributed, uint64 lastAt)
  {
    SWithdrawStatus memory status =  withdrawStatus_[_token][_beneficiary];
    return (status.recentlyDistributed, status.lastAt);
  }

  /**
   * @dev withdraw
   */
  function withdraw(IERC20 _token, uint256 _value) external override returns (bool) {
    if(!isOperator(msg.sender)) {
      SWithdrawLimit storage withdrawLimit_ = withdrawLimits[_token];
      withdrawLimit_ = (withdrawLimit_.maxBalance != 0) ?
        withdrawLimit_ : withdrawLimits[ALL_TOKENS];

      require(_value <= withdrawLimit_.maxBalance, "FC01");

      uint256 senderBalance =
        (address(_token) == address(0)) ? msg.sender.balance : _token.balanceOf(msg.sender);
      require(senderBalance.add(_value) <= withdrawLimit_.maxBalance, "FC02");

      if(withdrawLimit_.period > 0) {
        SWithdrawStatus storage senderStatus = withdrawStatus_[_token][msg.sender];

        uint256 currentTime_ = currentTime();
        uint256 timeDelta = (currentTime_ - senderStatus.lastAt);

        if(timeDelta < withdrawLimit_.period)  {
          senderStatus.recentlyDistributed = senderStatus.recentlyDistributed.sub(
            (timeDelta.mul(withdrawLimit_.maxBalance)).div(withdrawLimit_.period)).add(_value);
          require(senderStatus.recentlyDistributed <= withdrawLimit_.maxBalance, "FC03");
        } else {
          senderStatus.recentlyDistributed = _value;
        }

        senderStatus.lastAt = uint64(currentTime_);
      }
    }

    bool success;
    if(address(_token) == address(0)) {
      (success,) = transferInternal(msg.sender, _value, "");
    } else {
      success =_token.transfer(msg.sender, _value);
    }
    return success;
  }

  /*
   * @dev defineWithdrawLimit
   */
  function defineWithdrawLimit(
    IERC20 _token,
    uint256 _maxBalance,
    uint256 _period) external override onlyOperator returns (bool)
  {
    withdrawLimits[_token] = SWithdrawLimit(_maxBalance, _period);
    emit WithdrawLimitUpdate(_token, _maxBalance, _period);
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
