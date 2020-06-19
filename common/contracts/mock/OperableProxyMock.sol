pragma solidity ^0.6.0;

import "../core/OperableProxy.sol";


/**
 * @title OperableProxyMock
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OperableProxyMock is OperableProxy {

  bool public success;

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) public OperableProxy(_core) { }

  function setSuccess() public onlyOperator returns (bool) {
    success = true;
  }
}
