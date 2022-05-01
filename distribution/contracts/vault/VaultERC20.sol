pragma solidity ^0.8.0;

import "@c-layer/common/contracts/signer/SignerRecovery.sol";
import "@c-layer/common/contracts/operable/Operable.sol";
import "../interface/IVaultERC20.sol";


/**
 * @title VaultERC20
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VE01: Unable to transfer token
 *   VE02: Unable to transfer token from
 *   VE03: Unable to set allowance
 *   VE04: Unable to increase approval
 *   VE05: Unable to decrease approval
 *   VE06: Signer is not authorized
 *   VE07: The signature is not valid anymore
 */
contract VaultERC20 is IVaultERC20, Operable {
  using SignerRecovery for bytes;

  function transferERC20(IERC20 _token, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.transfer(_to, _value), "VE01");
    return true;
  }

  function transferFromERC20(
    IERC20 _token, address _from, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.transferFrom(_from, _to, _value), "VE02");
    return true;
  }

  function approveERC20(IERC20 _token, address _spender, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.approve(_spender, _value), "VE03");
    return true;
  }

  function increaseApprovalERC20(IERC20 _token, address _spender, uint _addedValue)
    public override onlyOperator returns (bool)
  {
    require(_token.increaseApproval(_spender, _addedValue), "VE04");
    return true;
  }

  function decreaseApprovalERC20(IERC20 _token, address _spender, uint _subtractedValue)
    public override onlyOperator returns (bool)
  {
    require(_token.decreaseApproval(_spender, _subtractedValue), "VE05");
    return true;
  }

  function withdrawERC20WithApproval(IERC20 _token, uint256 _value, uint64 _validity, bytes memory _signature)
    external override
  {
    address signer = _signature.recoverSigner(keccak256(abi.encode(_token, _value, _validity)));
    require(isOperator(signer), "VE06");
    require(_validity < block.timestamp, "VE07");
    _token.transferFrom(address(this), msg.sender, _value);
  }
}
