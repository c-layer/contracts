pragma solidity ^0.6.0;

import "./Storage.sol";
import "../call/DelegateCall.sol";
import "./Proxy.sol";


/**
 * @title Core
 * @dev Solidity version 0.5.x prevents to mark as view
 * @dev functions using delegate call.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   CO01: Only Proxy may access the function
 *   CO02: Address 0 is an invalid delegate address
 *   CO03: Delegatecall should be successful
 *   CO04: DelegateId must be greater than 0
 *   CO05: Proxy must exist
 *   CO06: Proxy must be already defined
 *   CO07: Proxy update must be successful
 **/
contract Core is Storage {
  using DelegateCall for address;

  modifier onlyProxy {
    require(delegates[proxyDelegateIds[msg.sender]] != address(0), "CO01");
    _;
  }

  function validProxyDelegate(address _proxy) internal view returns (address delegate) {
    uint256 delegateId = proxyDelegateIds[_proxy];
    delegate = delegates[delegateId];
    require(delegate != address(0), "CO02");
  }

  function delegateCall(address _proxy) internal returns (bool status)
  {
    return validProxyDelegate(_proxy)._delegateCall();
  }

  function delegateCallBool(address _proxy)
    internal returns (bool)
  {
    return validProxyDelegate(_proxy)._delegateCallBool();
  }

  function delegateCallUint256(address _proxy)
    internal returns (uint256)
  {
    return validProxyDelegate(_proxy)._delegateCallUint256();
  }

  function delegateCallBytes(address _proxy)
    internal returns (bytes memory result)
  {
    return validProxyDelegate(_proxy)._delegateCallBytes();
  }

  function defineDelegateInternal(uint256 _delegateId, address _delegate) internal returns (bool) {
    require(_delegateId != 0, "CO04");
    delegates[_delegateId] = _delegate;
    return true;
  }

  function defineProxyInternal(address _proxy, uint256 _delegateId)
    virtual internal returns (bool)
  {
    require(delegates[_delegateId] != address(0), "CO02");
    require(_proxy != address(0), "CO05");

    proxyDelegateIds[_proxy] = _delegateId;
    return true;
  }

  function migrateProxyInternal(address _proxy, address _newCore)
    internal returns (bool)
  {
    require(proxyDelegateIds[_proxy] != 0, "CO06");
    require(Proxy(_proxy).updateCore(_newCore), "CO07");
    return true;
  }

  function removeProxyInternal(address _proxy)
    internal virtual returns (bool)
  {
    require(proxyDelegateIds[_proxy] != 0, "CO06");
    delete proxyDelegateIds[_proxy];
    return true;
  }
}
