pragma solidity ^0.8.0;

import "@c-layer/token/contracts/TokenCore.sol";

/**
 * @title Token Core mock
 * @dev Token Core mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract TokenCoreMock is TokenCore {

  constructor(string memory _name, address[] memory _sysOperators)
    TokenCore(_name, _sysOperators) {}
}
