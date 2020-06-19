pragma solidity ^0.6.0;

/**
 * @title IProxy
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
interface IProxy {

  function core() external view returns (address);

}
