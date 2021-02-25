pragma solidity ^0.8.0;


/**
 * @title SafeMathMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract SafeMathMock {

  function mul(uint256 a, uint256 b) public pure returns (uint256 c) {
    return a * b;
  }

  function div(uint256 a, uint256 b) public pure returns (uint256) {
    return a / b;
  }

  function sub(uint256 a, uint256 b) public pure returns (uint256) {
    return a - b;
  }

  function add(uint256 a, uint256 b) public pure returns (uint256 c) {
    return a + b;
  }
}
