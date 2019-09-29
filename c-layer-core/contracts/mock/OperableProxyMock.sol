pragma solidity >=0.5.0 <0.6.0;

import "../operable/OperableProxy.sol";
import "../abstract/Proxy.sol";


/**
 * @title OperableProxyMock
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableProxyMock is OperableProxy {

  bool public successfull;

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) public OperableProxy(_core) { }

  function success() public onlyOperator returns (bool) {
    successfull = true;
  }
}
