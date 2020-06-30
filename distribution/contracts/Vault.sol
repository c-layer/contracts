pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "./interface/IVault.sol";


/**
 * @title Vault
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * VLT01: Invalid number of parameters
 */
contract Vault is IVault, Operable {

  receive() external payable {}
  fallback() external payable {}

  function transferETH(address _to, uint256 _value, bytes memory _data)
    public override onlyOperator returns (bool, bytes memory)
  {
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    return _to.call{ value: _value }(_data);
  }

  function transfer(IERC20 _token, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    return _token.transfer(_to, _value);
  }

  function transferFrom(
    IERC20 _token, address _from, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    return _token.transferFrom(_from, _to, _value);
  }

  function approve(IERC20 _token, address _spender, uint256 _value)
    public override onlyOperator returns (bool)
  {
    return _token.approve(_spender, _value);
  }

  function increaseApproval(IERC20 _token, address _spender, uint _addedValue)
    public override onlyOperator returns (bool)
  {
    return _token.increaseApproval(_spender, _addedValue);
  }

  function decreaseApproval(IERC20 _token, address _spender, uint _subtractedValue)
    public override onlyOperator returns (bool)
  {
    return _token.decreaseApproval(_spender, _subtractedValue);
  }
}
