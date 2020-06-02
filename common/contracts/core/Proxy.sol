pragma solidity ^0.6.0;

/**
 * @title Proxy
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   PR01: Only accessible by core
 *   PR02: Core request should be successfull
 **/
contract Proxy {

  address public core;

  /**
   * @dev Throws if called by any account other than a proxy
   */
  modifier onlyCore {
    require(core == msg.sender, "PR01");
    _;
  }

  constructor(address _core) public {
    core = _core;
  }

  /**
   * @dev update the core
   */
  function updateCore(address _core)
    public onlyCore returns (bool)
  {
    core = _core;
    return true;
  }

  /**
   * @dev enforce static immutability (view)
   * @dev in order to read core value through internal core delegateCall
   */
  function staticCallUint256() internal view returns (uint256 result) {
    (bool status, bytes memory value) = core.staticcall(msg.data);
    require(status, "PR02");
    // solhint-disable-next-line no-inline-assembly
    assembly {
      result := mload(add(value, 0x20))
    }
  }
}
