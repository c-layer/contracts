pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "../interface/IVault.sol";


/**
 * @title Vault
 * @dev Vault managing ERC20
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VA01: Unable to transfer ETH
 *   VA02: Unable to transfer token
 *   VA03: Unable to transfer token from
 *   VA04: Unable to set allowance
 *   VA05: Unable to increase approval
 *   VA06: Unable to decrease approval
 */
contract Vault is IVault, Operable {

  receive() external payable {}
  fallback() external payable {}

  /**
   * @dev constructor
   */
  constructor(address _beneficiary) public {
    transferOwnership(_beneficiary);
  }

  function transfer(address payable _to, uint256 _value, bytes memory _data)
    public override onlyOperator returns (bool, bytes memory)
  {
    return transferInternal(_to, _value, _data);
  }

  function transferERC20(IERC20 _token, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.transfer(_to, _value), "VA02");
    return true;
  }

  function transferERC20From(
    IERC20 _token, address _from, address _to, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.transferFrom(_from, _to, _value), "VA03");
    return true;
  }

  function approve(IERC20 _token, address _spender, uint256 _value)
    public override onlyOperator returns (bool)
  {
    require(_token.approve(_spender, _value), "VA04");
    return true;
  }

  function increaseApproval(IERC20 _token, address _spender, uint _addedValue)
    public override onlyOperator returns (bool)
  {
    require(_token.increaseApproval(_spender, _addedValue), "VA05");
    return true;
  }

  function decreaseApproval(IERC20 _token, address _spender, uint _subtractedValue)
    public override onlyOperator returns (bool)
  {
    require(_token.decreaseApproval(_spender, _subtractedValue), "VA06");
    return true;
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
