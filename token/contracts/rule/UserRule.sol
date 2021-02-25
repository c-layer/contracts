pragma solidity ^0.8.0;

import "@c-layer/oracle/contracts/interface/IUserRegistry.sol";
import "../interface/IRule.sol";


/**
 * @title UserRule
 * @dev UserRule contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * E01: The address is frozen
 */
contract UserRule is IRule {

  IUserRegistry internal userRegistry_;

  /**
   * @dev constructor
   */
  constructor(IUserRegistry _userRegistry) {
    userRegistry_ = _userRegistry;
  }

  /**
   * @dev userRegistry
   */
  function userRegistry() public view returns (IUserRegistry) {
    return userRegistry_;
  }

  /**
   * @dev validates an address
   */
  function isAddressValid(address _address) override public view returns (bool) {
    return userRegistry_.validUserId(_address) != 0;
  }

   /**
   * @dev validates a transfer of ownership
   */
  function isTransferValid(address _from, address _to, uint256 /* _amount */)
    override public view returns (bool)
  {
    return userRegistry_.validUserId(_from) != 0
      && userRegistry_.validUserId(_to) != 0;
  }
}
