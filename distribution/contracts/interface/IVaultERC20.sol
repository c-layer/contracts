pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title IVaultERC20
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVaultERC20 {

  function transferERC20(IERC20 _token, address _to, uint256 _value)
    public virtual returns (bool);
  function transferFromERC20(
    IERC20 _token, address _from, address _to, uint256 _value)
    public virtual returns (bool);
  function approveERC20(IERC20 _token, address _spender, uint256 _value)
    public virtual returns (bool);
  function increaseApprovalERC20(IERC20 _token, address _spender, uint _addedValue)
    public virtual returns (bool);
  function decreaseApprovalERC20(IERC20 _token, address _spender, uint _subtractedValue)
    public virtual returns (bool);

  function withdrawERC20WithApproval(
    IERC20 _token,
    uint256 _value,
    uint64 _validity,
    bytes memory _signature) external virtual;
}
