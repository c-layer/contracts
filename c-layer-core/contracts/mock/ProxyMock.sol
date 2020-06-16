pragma solidity >=0.5.0 <0.6.0;

import "../abstract/Proxy.sol";


/**
 * @title ProxyMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract ProxyMock is Proxy {

  constructor(address _core)
    public Proxy(_core) {}

  function successOnlyCore(bool _success) public view onlyCore returns (bool) {
    return _success;
  }
}
