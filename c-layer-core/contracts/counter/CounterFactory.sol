pragma solidity >=0.5.0 <0.6.0;

import "./CounterProxy.sol";


/**
 * @title CounterFactory
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 **/
contract CounterFactory {

  bytes public proxyCode;
  address public core;
 
  uint256 public proxyCount;
  mapping(uint256 => CounterProxy) proxies;

  constructor() public {
  }

  function saveProxyCode(CounterProxy _template) public returns (bool) {
    bytes memory code;
    assembly {
      let size := extcodesize(_template)
      code := mload(0x40)

      mstore(0x40, add(code, and(add(add(size, 0x20), 0x1f), not(0x1f))))
      mstore(code, size)
      extcodecopy(_template, add(code, 0x20), 0, size)
    }
    proxyCode = code;
    return true;
  }

  function createProxy() public returns (address proxyAddress) {
    bytes memory code = proxyCode;
    assembly {
      proxyAddress := create(0, add(code, 0x20), sload(code))
    }
    proxies[++proxyCount] = CounterProxy(proxyAddress);
    emit ProxyCreated(proxyAddress);
  }

  function createNProxy(uint256 _n) public returns (address[] memory proxyAddresses) {
    proxyAddresses = new address[](_n);
    bytes memory code = proxyCode;
    for(uint256 i=0; i < _n; i++) {
      address proxyAddress;
      assembly {
        proxyAddress := create(0, add(code, 0x20), sload(code))
      }
      proxies[++proxyCount] = CounterProxy(proxyAddress);
      proxyAddresses[i] = proxyAddress;
      emit ProxyCreated(proxyAddress);
    }
  }

  event ProxyCreated(address proxy);
}
