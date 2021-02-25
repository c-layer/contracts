pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Ownable.sol";
import "../interface/ISimpleVaultERC20.sol";


/**
 * @title SimpleVaultERC20
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   SV01: Beneficiary must be defined
 */
contract SimpleVaultERC20 is ISimpleVaultERC20, Ownable {

  constructor(address _beneficiary) {
    require(_beneficiary != address(0), "SV01");
    transferOwnership(_beneficiary);
  }

  function transfer(IERC20 _token, address _to, uint256 _value)
    public override onlyOwner returns (bool)
  {
    return _token.transfer(_to, _value);
  }
}
