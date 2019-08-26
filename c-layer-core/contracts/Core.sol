pragma solidity >=0.5.0 <0.6.0;

import "./Storage.sol";


/**
 * @title Core
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract Core is Storage {

  function delegateCall() public returns (bool status)
  {
    address delegate = proxyDelegates[msg.sender];
    require(delegate != address(0));
    (status, ) = delegate.delegatecall(msg.data);
  }

  function execute(bytes memory _data)
    public returns (bool, bytes memory)
  {
    address delegate = proxyDelegates[msg.sender];
    require(delegate != address(0));
    return delegate.delegatecall(_data);
  }

  function defineProxyDelegate(address _proxy, address _delegate) public returns (bool) {
    require(proxyDelegates[_proxy] == address(0));
    require(_delegate != address(0));
    proxyDelegates[_proxy] = _delegate;
    return true;
  }

}
