pragma solidity >=0.5.0 <0.6.0;

import "./Storage.sol";
import "../util/convert/BytesConvert.sol";


/**
 * @title Core
 * @dev Solidity version 0.5.x prevents to mark as view
 * @dev functions using delegate call.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 *   CO01: Only Proxy may access the function
 *   CO02: The proxy has no delegates
 *   CO03: Delegatecall should be successfulll
 *   CO04: Invalid delegateId
 *   CO05: Proxy must exist
 **/
contract Core is Storage {
  using BytesConvert for bytes;

  modifier onlyProxy {
    require(proxyDelegates[msg.sender] != address(0), "CO01");
    _;
  }

  function delegateCall(address _proxy) internal returns (bool status)
  {
    address delegate = proxyDelegates[_proxy];
    require(delegate != address(0), "CO02");
    // solhint-disable-next-line avoid-low-level-calls
    (status, ) = delegate.delegatecall(msg.data);
    require(status, "CO03");
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
    require(delegate != address(0), "CO04");
    // solhint-disable-next-line avoid-low-level-calls
    (status, result) = delegate.delegatecall(msg.data);
    require(status, "CO03");
  }

  function defineProxy(
    address _proxy,
    uint256 _delegateId)
    internal returns (bool)
  {
    require(_delegateId < delegates.length, "CO04");
    address delegate = delegates[_delegateId];

    require(_proxy != address(0), "CO05");
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
