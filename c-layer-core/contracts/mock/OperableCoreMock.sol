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
 * OP01: Message sender must be authorized
 */
contract OperableCoreMock is OperableCore {

  mapping(address => bool) public successfulls;

  function ALL_PRIVILEGES_() public pure returns (bytes32) {
    return ALL_PRIVILEGES;
  }

  function ALL_PROXIES_() public pure returns (address) {
    return ALL_PROXIES;
  }

  function successAsCoreOp(address _proxy)
    onlyCoreOp public returns (bool)
  {
    successfulls[_proxy] = true;
  }

  function successAsProxyOp(address _proxy)
    onlyProxyOp(_proxy) public returns (bool)
  {
    successfulls[_proxy] = true;
  }
}
