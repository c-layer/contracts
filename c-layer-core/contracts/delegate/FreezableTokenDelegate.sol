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
   * @dev Overriden transfer function
   */
  function transfer(address _sender, address _to, uint256 _value)
    public returns (bool)
  {
    require(areNotFrozen(_sender, _to), "FTD01");
    return super.transfer(_sender, _to, _value);
  }

  /**
   * @dev Overriden transferFrom function
   */
  function transferFrom(
    address _sender, address _from, address _to, uint256 _value)
    public returns (bool)
  {
    require(areNotFrozen(_from, _to), "FTD01");
    return super.transferFrom(_sender, _from, _to, _value);
  }

  /**
   * @dev can transfer
   */
  function canTransfer(
    address _from,
    address _to,
    uint256 _value) public view returns (TransferCode)
  {
    return areNotFrozen(_from, _to) ?
      super.canTransfer(_from, _to, _value) : TransferCode.FROZEN;
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
