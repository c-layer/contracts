pragma solidity ^0.8.0;


/**
 * @title IMintableERC20 interface
 *
 * SPDX-License-Identifier: MIT
 */
interface IMintableERC20 {

  event Burn(address indexed from, uint256 value);
  event Mint(address indexed to, uint256 value);
  event FinishMinting();

  function mintingFinished() external view returns (bool);
  function allTimeMinted() external view returns (uint256);

  function burn(uint256 _amount) external returns (bool);
  function mint(address[] memory _recipients, uint256[] memory _amounts)
    external returns (bool);
  function finishMinting() external returns (bool);
}
