pragma solidity ^0.6.0;

import "../math/SafeMath.sol";


/**
 * @title SafeMathMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract SafeMathMock {
  using SafeMath for uint256;

  function mul(uint256 a, uint256 b) public pure returns (uint256 c) {
    return a.mul(b);
  }

  function div(uint256 a, uint256 b) public pure returns (uint256) {
    return a.div(b);
  }

  function sub(uint256 a, uint256 b) public pure returns (uint256) {
    return a.sub(b);
  }

  function add(uint256 a, uint256 b) public pure returns (uint256 c) {
    return a.add(b);
  }
}
