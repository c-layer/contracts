pragma solidity ^0.8.0;

import "./interface/IVault.sol";
import "./vault/VaultETH.sol";
import "./vault/VaultERC20.sol";
import "./vault/VaultERC721.sol";


/**
 * @title Vault
 * @dev Vault managing ETH, ERC20 and ERC721
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract Vault is IVault, VaultETH, VaultERC20, VaultERC721 {

}
