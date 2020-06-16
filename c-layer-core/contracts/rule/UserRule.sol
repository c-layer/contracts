pragma solidity >=0.5.0 <0.6.0;

import "../interface/IRule.sol";
import "../interface/IUserRegistry.sol";


/**
 * @title UserRule
 * @dev UserRule contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * E01: The address is frozen
 */
contract UserRule is IRule {

  IUserRegistry internal userRegistry_;

  /**
   * @dev constructor
   */
  constructor(IUserRegistry _userRegistry) public {
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
  function isAddressValid(address _address) public view returns (bool) {
    return userRegistry_.validUserId(_address) != 0;
  }

   /**
   * @dev validates a transfer of ownership
   */
  function isTransferValid(address _from, address _to, uint256 /* _amount */)
    public view returns (bool)
  {
    return userRegistry_.validUserId(_from) != 0
      && userRegistry_.validUserId(_to) != 0;
  }
}
