pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IERC20.sol";


/**
 * @title ITokensale
 * @dev ITokensale interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract ITokensale {

  receive() external virtual payable;

  function investETH() public virtual payable;

  function token() public virtual view returns (IERC20);
  function vaultETH() public virtual view returns (address);
  function vaultERC20() public virtual view returns (address);
  function tokenPrice() public virtual view returns (uint256);
  function priceUnit() public virtual view returns (uint256);

  function totalRaised() public virtual view returns (uint256);
  function totalTokensSold() public virtual view returns (uint256);
  function totalUnspentETH() public virtual view returns (uint256);
  function totalRefundedETH() public virtual view returns (uint256);
  function availableSupply() public virtual view returns (uint256);

  function investorUnspentETH(address _investor) public virtual view returns (uint256);
  function investorInvested(address _investor) public virtual view returns (uint256);
  function investorTokens(address _investor) public virtual view returns (uint256);

  function tokenInvestment(address _investor, uint256 _amount) public virtual view returns (uint256);
  function refundManyUnspentETH(address payable[] memory _receivers) public virtual returns (bool);
  function refundUnspentETH() public virtual returns (bool);
  function withdrawAllETHFunds() public virtual returns (bool);
  function fundETH() public virtual payable;

  event RefundETH(address indexed recipient, uint256 amount);
  event WithdrawETH(uint256 amount);
  event FundETH(uint256 amount);
  event Investment(address indexed investor, uint256 invested, uint256 tokens);
}
