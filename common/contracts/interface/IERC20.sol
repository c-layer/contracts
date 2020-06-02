pragma solidity ^0.6.0;


/**
 * @title IERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 * @dev see https://github.com/ethereum/EIPs/issues/179
 *
 * SPDX-License-Identifier: MIT
 */
abstract contract IERC20 {

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );

  function name() virtual public view returns (string memory);
  function symbol() virtual public view returns (string memory);
  function decimals() virtual public view returns (uint256);
  function totalSupply() virtual public view returns (uint256);
  function balanceOf(address who) virtual public view returns (uint256);
  function transfer(address to, uint256 value) virtual public returns (bool);

  function allowance(address owner, address spender)
    virtual public view returns (uint256);

  function transferFrom(address from, address to, uint256 value)
    virtual public returns (bool);

  function approve(address spender, uint256 value) virtual public returns (bool);

  function increaseApproval(address spender, uint addedValue)
    virtual public returns (bool);

  function decreaseApproval(address spender, uint subtractedValue)
    virtual public returns (bool);
}
