pragma solidity ^0.6.0;

import "../core/OperableCore.sol";


/**
 * @title OperableCoreMock
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract OperableCoreMock is OperableCore {

  mapping(address => bool) public successfulls;

  constructor(address[] memory _sysOperators) public
    OperableCore(_sysOperators) {}

  function defineDelegate(uint256 _delegateId, address _delegate) public returns (bool) {
    return _defineDelegate(_delegateId, _delegate);
  }

  function defineProxy(address _proxy, uint256 _delegateId) public returns (bool) {
    return _defineProxy(_proxy, _delegateId);
  }

  function allPrivileges() public pure returns (bytes32) {
    return _ALL_PRIVILEGES;
  }

  function allProxies() public pure returns (address) {
    return _ALL_PROXIES;
  }

  function successAsCoreOp(address _proxy)
    public onlyCoreOp returns (bool)
  {
    successfulls[_proxy] = true;
  }

  function successAsProxyOp(address _proxy)
    public onlyProxyOp(_proxy) returns (bool)
  {
    successfulls[_proxy] = true;
  }
}
