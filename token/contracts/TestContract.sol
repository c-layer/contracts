pragma solidity ^0.6.0;


/**
 * @title TestContract
 * @dev TestContract contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract TestContract {

  struct STest {
    uint256 a;
    uint256 b;
  }

  STest public s1;
  STest public s2;
  STest[] public ss1;
  mapping(uint256 => STest) public sm1;

  function storeNewStruct1(uint256 _a, uint256 _b) public {
    s1 = STest(_a, _b);
  }

  function storeNewStruct1Seq(uint256 _a, uint256 _b) public {
    s2.a = _a;
    s2.b = _b;
  }
}
