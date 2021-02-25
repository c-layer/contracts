pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Ownable.sol";
import "../interface/ISimpleVaultERC20.sol";


/**
 * @title TimeLockedSimpleVaultERC20
 * @dev Time locked mini vault ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   TLV01: Vault is locked
 *   TLV02: Beneficiary must be defined
 *   TLV03: Cannot be locked in the past
 */
contract TimeLockedSimpleVaultERC20 is ISimpleVaultERC20, Ownable {

  uint64 public lockedUntil;

  modifier whenUnlocked() {
    require(lockedUntil < currentTime(), "TLV01");
    _;
  }

  constructor(address _beneficiary, uint64 _lockedUntil) {
    require(_beneficiary != address(0), "TLV02");
    require(_lockedUntil > currentTime(), "TLV03");
    lockedUntil = _lockedUntil;
    transferOwnership(_beneficiary);
  }

  function transfer(IERC20 _token, address _to, uint256 _value)
    public override onlyOwner whenUnlocked returns (bool)
  {
    return _token.transfer(_to, _value);
  }

  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
