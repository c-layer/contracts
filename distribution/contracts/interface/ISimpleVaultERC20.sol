pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title SimpleVaultERC20
 * @dev SimpleVault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract ISimpleVaultERC20 {
  function transfer(IERC20 _token, address _to, uint256 _value)
    public virtual returns (bool);
}
