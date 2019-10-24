pragma solidity >=0.5.0 <0.6.0;

import "../abstract/Factory.sol";


/**
 * @title FactoryMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract FactoryMock is Factory {

  /**
   * @dev constructor
   */
  constructor() public Factory() {}

  /**
   * @dev defineProxyCode
   */
  function defineProxyCode(address _core, bytes memory _proxyCode)
    public returns (bool)
  {
    return defineProxyCodeInternal(_core, _proxyCode);
  }

  /**
   * @dev deployProxy
   */
  function deployProxy() public returns (bool)
  {
    address proxy = deployProxyInternal();
    emit ProxyDeployed(proxy);
    return true;
  }

  event ProxyDeployed(address proxy);
}
