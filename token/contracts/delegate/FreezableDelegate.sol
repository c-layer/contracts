pragma solidity ^0.6.0;

import "./STransferData.sol";
import "../TokenStorage.sol";


/**
 * @title FreezableDelegate
 * @dev FreezableDelegate contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * FTD01: The address is frozen
 */
abstract contract FreezableDelegate is TokenStorage {

  /**
   * @dev allow owner to freeze several addresses
   * @param _until allows to auto unlock if the frozen time is known initially.
   * otherwise infinity can be used
   */
  function freezeManyAddresses(
    address _token,
    address[] memory _addresses,
    uint256 _until) public returns (bool)
  {
    mapping(address => uint256) storage frozenUntils = tokens[_token].frozenUntils;
    for (uint256 i = 0; i < _addresses.length; i++) {
      frozenUntils[_addresses[i]] = _until;
      emit Freeze(_token, _addresses[i], _until);
    }
    return true;
  }

  /**
   * @dev isFrozen
   */
  function isFrozen(STransferData memory _transferData) internal view returns (bool) {
    mapping(address => uint256) storage frozenUntils = tokens[_transferData.token].frozenUntils;
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = block.timestamp;
    return currentTime < frozenUntils[_transferData.caller]
      || currentTime < frozenUntils[_transferData.sender]
      || currentTime < frozenUntils[_transferData.receiver];
  }
}
