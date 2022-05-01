pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "../interface/IVaultETH.sol";


/**
 * @title VaultETH
 * @dev Vault managing ETH
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VA01: Unable to transfer ETH
 */
contract VaultETH is IVaultETH, Operable {

  receive() external payable {}
  fallback() external payable {}

  function transfer(address payable _to, uint256 _value, bytes memory _data)
    public override onlyOperator returns (bool, bytes memory)
  {
    return transferInternal(_to, _value, _data);
  }

  function transferInternal(address payable _to, uint256 _value, bytes memory _data)
    internal returns (bool, bytes memory)
  {
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    (bool success, bytes memory result) = _to.call{ value: _value }(_data);
    require(success, "VA01");
    return (success, result);
  }
}
