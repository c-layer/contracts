pragma solidity ^0.6.0;

import "../vault/TimeLockedSimpleVaultERC20.sol";


/**
 * @title TimeLockedSimpleVaultERC20
 * @dev Time locked mini vault ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract TimeLockedSimpleVaultERC20Mock is TimeLockedSimpleVaultERC20 {

  constructor(uint64 _lockUntil) public TimeLockedSimpleVaultERC20(_lockUntil) {}

  function setLockUntilTest(uint64 _lockUntil) public returns (bool) {
    lockUntil = _lockUntil;
    return true;
  }
}
