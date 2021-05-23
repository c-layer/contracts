pragma solidity ^0.8.0;

import "../TokenCore.sol";
import "./TokenStorageTimeMock.sol";


/**
 * @title TokenCoreMock
 * @dev Token Core Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract TokenCoreMock is TokenCore, TokenStorageTimeMock {

  /**
   * @dev constructor
   */
  constructor(string memory _name, address[] memory _sysOperators)
    TokenCore(_name, _sysOperators) {}

  function defineTime(uint256 _currentTime) public returns (bool) {
    currentTime_ = _currentTime;
    return true;
  }

  function defineInterestFrom(address _token, uint256 _interestFrom) public returns (bool)
  {
    tokens[_token].interestFrom = _interestFrom;
    return true;
  }
}
