pragma solidity ^0.6.0;


/**
 * @title IERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 * @dev see https://github.com/ethereum/EIPs/issues/179
 *
 * SPDX-License-Identifier: MIT
 */
interface IERC20 {

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );

  function name() external view returns (string memory);
  function symbol() external view returns (string memory);
  function decimals() external view returns (uint256);
  function totalSupply() external view returns (uint256);
  function balanceOf(address who) external view returns (uint256);
  function transfer(address to, uint256 value) external returns (bool);

  function allowance(address owner, address spender)
    external view returns (uint256);

  function transferFrom(address from, address to, uint256 value)
    external returns (bool);

  function approve(address spender, uint256 value) external returns (bool);

  function increaseApproval(address spender, uint addedValue)
    external returns (bool);

  function decreaseApproval(address spender, uint subtractedValue)
    external returns (bool);
}
