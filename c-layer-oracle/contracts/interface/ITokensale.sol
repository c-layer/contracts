pragma solidity >=0.5.0 <0.6.0;

import "../interface/IERC20.sol";


/**
 * @title ITokensale
 * @dev ITokensale interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract ITokensale {

  function () external payable;
  function investETH() public payable;

  function token() public view returns (IERC20);
  function vaultETH() public view returns (address);
  function vaultERC20() public view returns (address);
  function tokenPrice() public view returns (uint256);
  function totalRaised() public view returns (uint256);
  function totalUnspentETH() public view returns (uint256);
  function totalRefundedETH() public view returns (uint256);
  function availableSupply() public view returns (uint256);
  
  function investorUnspentETH(address _investor) public view returns (uint256);
  function investorInvested(address _investor) public view returns (uint256);
  function investorTokens(address _investor) public view returns (uint256);

  function tokenInvestment(address _investor, uint256 _amount) public view returns (uint256);
  function refundManyUnspentETH(address payable[] memory _receivers) public returns (bool);
  function refundUnspentETH() public returns (bool);
  function withdrawAllETHFunds() public returns (bool);
  function fundETH() public payable;

  event RefundETH(address indexed recipient, uint256 amount);
  event WithdrawETH(uint256 amount);
  event FundETH(uint256 amount);
  event Investment(address indexed investor, uint256 invested, uint256 tokens);
}
