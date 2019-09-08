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
 * OP01: Message sender must be authorized
 */
contract OperableProxyMock is OperableProxy {

  bool public successfull;

  constructor(address _core) OperableProxy(_core) public { }

  function success() onlyOperator public returns (bool) {
    successfull = true;
  }
}
