pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";


/**
 * @title FreezableTokenDelegate
 * @dev FreezableTokenDelegate contract
 * This rule allow a legal authority to enforce a freeze of assets.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * FTD01: The address is frozen
 */
contract FreezableTokenDelegate is BaseTokenDelegate {

  /**
   * @dev Overriden transferInternal function
   */
  function transferInternal(TransferData memory _transferData) internal returns (bool)
  {
    require(areNotFrozen(_transferData.sender, _transferData.receiver), "FTD01");
    return super.transferInternal(_transferData);
  }

  /**
   * @dev Overriden can transferInternal
   */
  function canTransferInternal(TransferData memory _transferData)
    internal view returns (TransferCode)
  {
    return areNotFrozen(_transferData.sender, _transferData.receiver) ?
      super.canTransferInternal(_transferData) : TransferCode.FROZEN;
  }

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
    mapping(address => uint256) storage frozenUntils = tokens_[_token].frozenUntils;
    for (uint256 i = 0; i < _addresses.length; i++) {
      frozenUntils[_addresses[i]] = _until;
      emit Freeze(_addresses[i], _until);
    }
    return true;
  }

  /**
   * @dev areNotFrozen
   */
  function areNotFrozen(address _from, address _to) private view returns (bool) {
    mapping(address => uint256) storage frozenUntils = tokens_[msg.sender].frozenUntils;
    // solhint-disable-next-line not-rely-on-time
    uint256 currentTime = now;
    return (frozenUntils[msg.sender] < currentTime
      && frozenUntils[_from] < currentTime
      && frozenUntils[_to] < currentTime);
  }
}
