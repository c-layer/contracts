pragma solidity ^0.6.0;

import "./IVault.sol";


/**
 * @title IFaucet
 * @dev Vaultinterface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract IFaucet is IVault {

  IERC20 internal constant ALL_TOKENS = IERC20(0x416c6c546f6b656e73); // "AllTokens"

  // Token address is null when it is the ethers' limit
  event WithdrawLimitUpdate(
    IERC20 token,
    uint256 maxBalance,
    uint256 maxWithdrawOnce,
    uint256 maxWithdrawAllTime,
    uint256 maxWithdrawPeriod,
    uint256 period);

  struct SWithdrawStatus {
    uint256 allTimeDistributed;
    uint256 recentlyDistributed;
    uint64 lastAt;
  }

  struct SWithdrawLimit {
    uint256 maxBalance;
    uint256 maxWithdrawOnce;
    uint256 maxWithdrawPeriod;
    uint256 maxWithdrawAllTime;
    uint256 period;
  }

  function withdrawLimit(IERC20 _token)
    external virtual view returns (
      uint256 maxBalance,
      uint256 maxWithdrawOnce,
      uint256 maxWithdrawPeriod,
      uint256 maxWithdrawAllTime,
      uint256 period);

  function withdrawStatus(IERC20 _token, address _beneficiary)
    external virtual view returns (
    uint256 allTimeDistributed,
    uint256 recentlyDistributed,
    uint64 lastAt);

  function withdraw(IERC20 _token, uint256 _value) external virtual returns (bool);

  function withdrawTo(IERC20 _token, address payable _to, uint256 _value)
    external virtual returns (bool);

  function defineWithdrawLimit(
    IERC20 _token,
    uint256 _maxBalance,
    uint256 _maxWithdrawOnce,
    uint256 _maxWithdrawAllTime,
    uint256 _mxWithdrawPeriod,
    uint256 _period)
    external virtual returns (bool); 
}
