pragma solidity ^0.8.0;

import "../Faucet.sol";


/**
 * @title Faucet
 * @dev Time locked mini vault ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract FaucetMock is Faucet {

  function defineWithdrawStatusLastAtTest(
    IERC20 _token,
    address _beneficiary,
    uint64 _lastAt) public returns (bool)
  {
    withdrawStatus_[_token][_beneficiary].lastAt = _lastAt;
    return true;
  }
}
