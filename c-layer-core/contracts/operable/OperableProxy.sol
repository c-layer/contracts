pragma solidity >=0.5.0 <0.6.0;

import "./OperableCore.sol";
import "../abstract/Proxy.sol";


/**
 * @title OperableProxy
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * OP01: Message sender must be authorized
 */
contract OperableProxy is Proxy {

  // solhint-disable-next-line no-empty-blocks
  constructor(address _core) public Proxy(_core) { }

  /**
   * @dev rely on the core configuration for ownership
   */
  function owner() public view returns (address) {
    return OperableCore(core).owner();
  }

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperator {
    require(OperableCore(core).hasProxyPrivilege(
      msg.sender, address(this), msg.sig), "OP01");
    _;
  }
}
