pragma solidity ^0.8.0;

import "@c-layer/token/contracts/TokenProxy.sol";

/**
 * @title Token Proxy mock
 * @dev Token Proxy mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract TokenProxyMock is TokenProxy {

  constructor(address _core) TokenProxy(_core) { }
}
