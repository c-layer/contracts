pragma solidity >=0.5.0 <0.6.0;

import "../ownership/Ownable.sol";
import "../interface/IRule.sol";


/**
 * @title FreezeRule
 * @dev FreezeRule contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * E01: The address is frozen
 */
contract FreezeRule is IRule, Ownable {

  mapping(address => uint256) freezer;
  uint256 allFreezedUntil;

  /**
   * @dev is rule frozen
   */
  function isFrozen() public view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return allFreezedUntil > now ;
  }

  /**
   * @dev is address frozen
   */
  function isAddressFrozen(address _address) public view returns (bool) {
    // solium-disable-next-line security/no-block-members
    return freezer[_address] > now;
  }

  /**
   * @dev allow owner to freeze the address
   * @param _until allows to auto unlock if the frozen time is known initially.
   * otherwise infinity can be used
   */
  function freezeAddress(address _address, uint256 _until)
    public onlyOwner returns (bool)
  {
    freezer[_address] = _until;
    emit Freeze(_address, _until);
  }

  /**
   * @dev allow owner to freeze several addresses
   * @param _until allows to auto unlock if the frozen time is known initially.
   * otherwise infinity can be used
   */
  function freezeManyAddresses(address[] memory _addresses, uint256 _until)
    public onlyOwner returns (bool)
  {
    for (uint256 i = 0; i < _addresses.length; i++) {
      freezer[_addresses[i]] = _until;
      emit Freeze(_addresses[i], _until);
    }
  }

  /**
   * @dev freeze all until
   */
  function freezeAll(uint256 _until) public
    onlyOwner returns (bool)
  {
    allFreezedUntil = _until;
    emit FreezeAll(_until);
  }

  /**
   * @dev validates an address
   */
  function isAddressValid(address _address) public view returns (bool) {
    return !isFrozen() && !isAddressFrozen(_address);
  }

   /**
   * @dev validates a transfer of ownership
   */
  function isTransferValid(address _from, address _to, uint256 /* _amount */)
    public view returns (bool)
  {
    return !isFrozen() && (!isAddressFrozen(_from) && !isAddressFrozen(_to));
  }

  event FreezeAll(uint256 until);
  event Freeze(address _address, uint256 until);
}
