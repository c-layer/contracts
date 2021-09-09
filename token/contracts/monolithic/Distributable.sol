pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "../interface/IDistributable.sol";
import "./LockableTransfer.sol";


/**
 * @title Distributable
 * @dev Distributable contract
 * This contract provides a token distribution function
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * DI01: recipients and amounts must have the same length
 * DI02: transfer must be successfull
 */
abstract contract Distributable is TokenERC20, IDistributable {

  /**
   * @dev distribute
   */
  function distribute(address _from, address[] calldata _tos, uint256[] calldata _values)
    override external returns (bool)
  {
    require(_tos.length == _values.length, "DI01");
    for(uint256 i=0; i < _tos.length; i++) {
      require(transferFromInternal(_from, _tos[i], _values[i]), "DI02");
    }
    return true;
  }
}
