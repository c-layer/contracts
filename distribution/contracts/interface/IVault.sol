pragma solidity ^0.6.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title Vault
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVault {

  function transfer(address payable _to, uint256 _value, bytes memory _data)
    public virtual returns (bool, bytes memory);
  function transferERC20(IERC20 _token, address _to, uint256 _value)
    public virtual returns (bool);
  function transferERC20From(
    IERC20 _token, address _from, address _to, uint256 _value)
    public virtual returns (bool);
  function approve(IERC20 _token, address _spender, uint256 _value)
    public virtual returns (bool);
  function increaseApproval(IERC20 _token, address _spender, uint _addedValue)
    public virtual returns (bool);
  function decreaseApproval(IERC20 _token, address _spender, uint _subtractedValue)
    public virtual returns (bool);
}
