pragma solidity >=0.5.0 <0.6.0;

import "./Core.sol";

/**
 * @title Proxy
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 **/
contract Proxy {

  address public core;

  /**
   * @dev Throws if called by any account other than a proxy
   */
  modifier onlyCore {
    require(core == msg.sender);
    _;
  }

  constructor(address _core) public {
    core = _core;
  }
}
