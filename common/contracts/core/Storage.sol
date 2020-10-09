pragma solidity ^0.6.0;


/**
 * @title Storage
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
contract Storage {
  mapping(address => uint256) internal proxyDelegateIds;
  mapping(uint256 => address) internal delegates;
}
