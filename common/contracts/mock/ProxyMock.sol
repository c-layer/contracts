pragma solidity ^0.6.0;

import "../core/Proxy.sol";


/**
 * @title ProxyMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract ProxyMock is Proxy {

  constructor(address _core) public Proxy(_core) { }

  function successOnlyCore(bool _success) public view onlyCore returns (bool) {
    return _success;
  }

  function delegateCallUint256Mock(uint256) public view returns (uint256) {
    return staticCallUint256();
  }
}
