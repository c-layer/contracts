pragma solidity ^0.8.0;

import "./IVaultETH.sol";
import "./IVaultERC20.sol";
import "./IVaultERC721.sol";


/**
 * @title IVault
 * @dev Vault managing ETH, ERC20 and ERC721
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVault is IVaultETH, IVaultERC20, IVaultERC721 {
}
