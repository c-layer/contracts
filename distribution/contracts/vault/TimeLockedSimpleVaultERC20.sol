pragma solidity ^0.6.0;

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
 *   TLV02: Cannot be locked in the past
 */
contract TimeLockedSimpleVaultERC20 is ISimpleVaultERC20, Ownable {

  uint64 public lockUntil;

  modifier whenUnlocked() {
    // solhint-disable-next-line not-rely-on-time
    require(lockUntil < currentTime(), "TLV01");
    _;
  }

  constructor(uint64 _lockUntil) public {
    require(_lockUntil > currentTime(), "TLV02");
    lockUntil = _lockUntil;
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
    return now;
  }
}
