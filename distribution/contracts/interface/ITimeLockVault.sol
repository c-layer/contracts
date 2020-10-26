pragma solidity ^0.6.0;

import "./IVault.sol";


/**
 * @title ITimeLockVault
 * @dev TimeLock Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract ITimeLockVault is IVault {

  enum UnlockMode {
    AT_ONCE,
    LINEAR
  }

  function timeLock() public view virtual returns (
    IERC20 token, uint64 start, uint64 end, UnlockMode mode);

  function distribution(address _recipient) public view virtual returns (
    uint256 value, uint256 availabe, uint64 lastDistribution);

  function distribute() public virtual returns (bool);

  function distributeMany(address[] memory _recipients) public virtual returns (bool);

  function defineTimeLock(
    IERC20 _token,
    uint64 _start,
    uint64 _end,
    UnlockMode _mode,
    address[] memory _recipients,
    uint256[] memory _amounts) public virtual returns (bool);

  event Distribution(address recipient, uint256 value);
  event TimeLockDefined(
    IERC20 token,
    uint64 start,
    uint64 end,
    UnlockMode mode,
    address[] recipients,
    uint256[] values);
}
