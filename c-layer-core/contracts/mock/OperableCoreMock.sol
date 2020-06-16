pragma solidity >=0.5.0 <0.6.0;

import "../operable/OperableCore.sol";


/**
 * @title OperableProxyMock
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableCoreMock is OperableCore {

  mapping(address => bool) public successfulls;

  function allPrivileges() public pure returns (bytes32) {
    return ALL_PRIVILEGES;
  }

  function allProxies() public pure returns (address) {
    return ALL_PROXIES;
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
