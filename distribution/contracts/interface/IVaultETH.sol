pragma solidity ^0.8.0;

/**
 * @title VaultETH
 * @dev Vault managing ETH
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVaultETH {

  function transfer(address payable _to, uint256 _value, bytes memory _data)
    public virtual returns (bool, bytes memory);
}
