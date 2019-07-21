pragma solidity >=0.5.0 <0.6.0;

import "../interface/ITokensale.sol";
import "../interface/IERC20.sol";
import "../util/math/SafeMath.sol";
import "../util/governance/Operable.sol";
import "../util/lifecycle/Pausable.sol";


/**
 * @title Tokensale
 * @dev Tokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * TOS01: No data must be sent while sending ETH
 * TOS02: Token transfer must be successfull
 * TOS03: No ETH to refund
 * TOS04: Cannot invest onchain and offchain at the same time
 * TOS05: Cannot invest if no more tokens
 */
contract Tokensale is ITokensale, Operable, Pausable {
  using SafeMath for uint256;

  /* General sale details */
  IERC20 internal token_;
  address payable internal vaultETH_;
  address internal vaultERC20_;

  uint256 internal tokenPrice_;
  uint256 internal totalRaised_;
  uint256 internal totalUnspentETH_;
  uint256 internal totalRefundedETH_;

  struct Investor {
    uint256 unspentETH;
    uint256 invested;
    uint256 tokens;
  }
  mapping(address => Investor) internal investors;

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice
  ) public
  {
    token_ = _token;
    vaultERC20_ = _vaultERC20;
    vaultETH_ = _vaultETH;
    tokenPrice_ = _tokenPrice;
  }

  /**
   * @dev fallback function
   */
  //solhint-disable-next-line no-complex-fallback
  function () external payable {
    require(msg.data.length == 0, "TOS01");
    investETH();
  }

  /* Investment */
  function investETH() public payable
  {
    investInternal(msg.sender, msg.value);
  }

  /**
   * @dev returns the token sold
   */
  function token() public view returns (IERC20) {
    return token_;
  }

  /**
   * @dev returns the vault use to
   */
  function vaultETH() public view returns (address) {
    return vaultETH_;
  }

  /**
   * @dev returns the vault to receive ETH
   */
  function vaultERC20() public view returns (address) {
    return vaultERC20_;
  }

  /**
   * @dev returns token price
   */
  function tokenPrice() public view returns (uint256) {
    return tokenPrice_;
  }

  /**
   * @dev returns total raised
   */
  function totalRaised() public view returns (uint256) {
    return totalRaised_;
  }

  /**
   * @dev returns total unspent ETH
   */
  function totalUnspentETH() public view returns (uint256) {
    return totalUnspentETH_;
  }

  /**
   * @dev returns total refunded ETH
   */
  function totalRefundedETH() public view returns (uint256) {
    return totalRefundedETH_;
  }

  /**
   * @dev returns the available supply
   */
  function availableSupply() public view returns (uint256) {
    uint256 vaultSupply = token_.balanceOf(vaultERC20_);
    uint256 allowance = token_.allowance(vaultERC20_, address(this));
    return (vaultSupply < allowance) ? vaultSupply : allowance;
  }
 
  /* Investor specific attributes */
  function investorUnspentETH(address _investor)
    public view returns (uint256)
  {
    return investorInternal(_investor).unspentETH;
  }

  function investorInvested(address _investor)
    public view returns (uint256)
  {
    return investorInternal(_investor).invested;
  }

  function investorTokens(address _investor) public view returns (uint256) {
    return investorInternal(_investor).tokens;
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address, uint256 _amount)
    public view returns (uint256)
  {
    uint256 availableSupplyValue = availableSupply();
    uint256 contribution = _amount.div(tokenPrice_);

    return (contribution < availableSupplyValue) ? contribution : availableSupplyValue;
  }

  /**
   * @dev refund unspentETH ETH many
   */
  function refundManyUnspentETH(address payable[] memory _receivers)
    public onlyOperator returns (bool)
  {
    for (uint256 i = 0; i < _receivers.length; i++) {
      refundUnspentETHInternal(_receivers[i]);
    }
    return true;
  }

  /**
   * @dev refund unspentETH
   */
  function refundUnspentETH() public returns (bool) {
    refundUnspentETHInternal(msg.sender);
    return true;
  }

  /**
   * @dev withdraw all ETH funds
   */
  function withdrawAllETHFunds() public onlyOperator returns (bool) {
    uint256 balance = address(this).balance;
    withdrawETHInternal(balance);
  }

  /**
   * @dev fund ETH
   */
  function fundETH() public payable onlyOperator {
    emit FundETH(msg.value);
  }

  function investorInternal(address _investor)
    internal view returns (Investor storage)
  {
    return investors[_investor];
  }

  /**
   * @dev update unspent ETH
   */
  function updateUnspentETHInternal(Investor storage _investor, uint256 _unspentETH) internal {
    totalUnspentETH_ = totalUnspentETH_.sub(_investor.unspentETH).add(_unspentETH);
    _investor.unspentETH = _unspentETH;
  }

  /**
   * @dev update investor internal
   */
  function updateInvestorInternal(Investor storage _investor, uint256 _tokens)
    internal returns (uint256)
  {
    uint256 invested = _tokens.mul(tokenPrice_);
    _investor.invested = _investor.invested.add(invested);
    _investor.tokens = _investor.tokens.add(_tokens);
    totalRaised_ = totalRaised_.add(invested);

    return invested;
  }

  /**
   * @dev distribute tokens internal
   */
  function distributeTokensInternal(address _investor, uint256 _tokens) internal {
    require(
      token_.transferFrom(vaultERC20_, _investor, _tokens),
      "TOS02");
  }

  /**
   * @dev refund unspentETH internal
   */
  function refundUnspentETHInternal(address payable _investor) internal {
    Investor storage investor = investorInternal(_investor);
    require(investor.unspentETH > 0, "TOS03");

    uint256 unspentETH = investor.unspentETH;
    totalRefundedETH_ = totalRefundedETH_.add(unspentETH);
    totalUnspentETH_ = totalUnspentETH_.sub(unspentETH);
    investor.unspentETH = 0;

    // Multiple sends are required for refundManyUnspentETH
    // solhint-disable-next-line multiple-sends
    _investor.transfer(unspentETH);
    emit RefundETH(_investor, unspentETH);
  }

  /**
   * @dev withdraw ETH internal
   */
  function withdrawETHInternal(uint256 _amount) internal {
    // Send is used after the ERC20 transfer
    // solhint-disable-next-line multiple-sends
    vaultETH_.transfer(_amount);
    emit WithdrawETH(_amount);
  }

  /**
   * @dev invest internal
   */
  function investInternal(address _investor, uint256 _amount)
    internal whenNotPaused
  {
    require(_amount != 0, "TOS04");

    Investor storage investor = investorInternal(_investor);
    uint256 amount = investor.unspentETH.add(_amount);
    uint256 tokens = tokenInvestment(_investor, amount);
    require(tokens != 0, "TOS05");

    uint256 invested = updateInvestorInternal(investor, tokens);
    updateUnspentETHInternal(investor, amount.sub(invested));

    emit Investment(_investor, invested);
 
    /* Reentrancy risks: No state change must come below */
    distributeTokensInternal(_investor, tokens);
    withdrawETHInternal(invested);
  }
}
