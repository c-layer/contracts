pragma solidity >=0.5.0 <0.6.0;

import "./Storage.sol";
import "./Factory.sol";
import "../util/convert/BytesConvert.sol";


/**
 * @title Core
 * Solidity version 0.5.0 prevents to mark as view
 * functions using delegate call.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   CO01: The proxy has no delegates
 *   CO02: Delegatecall should be successfulll
 *   CO03: Invalid delegateId
 *   CO04: Factory was unable to create a proxy
 **/
contract Core is Storage {
  using BytesConvert for bytes;

  modifier onlyProxy {
    require(proxyDelegates[msg.sender] != address(0));
    _;
  }

  function delegateCall(address _proxy) internal returns (bool status)
  {
    address delegate = proxyDelegates[_proxy];
    require(delegate != address(0), "CO01");
    (status, ) = delegate.delegatecall(msg.data);
    require(status, "CO02");
  }

  function delegateCallUint256(address _proxy)
    internal returns (uint256)
  {
    return delegateCallBytes(_proxy).toUint256();
  }

  function delegateCallBytes(address _proxy)
    internal returns (bytes memory result)
  {
    bool status;
    address delegate = proxyDelegates[_proxy];
    require(delegate != address(0), "CO03");
    (status, result) = delegate.delegatecall(msg.data);
    require(status, "CO02");
  }

  function defineProxy(
    address _proxy,
    uint256 _delegateId)
    internal returns (bool)
  {
    require(_delegateId < delegates.length, "CO03");
    address delegate = delegates[_delegateId];

    require(_proxy != address(0), "CO04");
    proxyDelegates[_proxy] = delegate;
    return true;
  }

  function removeProxy(address _proxy)
    internal returns (bool)
  {
    delete proxyDelegates[_proxy];
    return true;
  }
}
