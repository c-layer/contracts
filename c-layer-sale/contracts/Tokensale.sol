pragma solidity >=0.5.0 <0.6.0;

import "./interface/IUserRegistry.sol";
import "./interface/ITokensale.sol";
import "./interface/IRatesProvider.sol";
import "./interface/IERC20.sol";
import "./math/SafeMath.sol";
import "./lifecycle/Pausable.sol";
import "./Operator.sol";


/**
 * @title Tokensale
 * @dev Tokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * TOS01: It must be before the sale is opened
 * TOS02: Sale must be open
 * TOS03: It must be before the sale is closed
 * TOS04: It must be after the sale is closed
 * TOS05: No data must be sent while sending ETH
 * TOS06: Share Purchase Agreement Hashes must match
 * TOS07: User/Investor must exist
 * TOS08: SPA must be accepted before any ETH investment
 * TOS09: Cannot update schedule once started
 * TOS10: Investor must exist
 * TOS11: Cannot allocate more tokens than available supply
 * TOS12: InvestorIds and amounts must match
 * TOS13: Investor must exist
 * TOS14: Must refund ETH unspent
 * TOS15: Must withdraw ETH to vaultETH
 * TOS16: Cannot invest onchain and offchain at the same time
 * TOS17: A ETHCHF rate must exist to invest
 * TOS18: User must be valid
 * TOS19: Cannot invest if no more tokens
 * TOS20: Investment is below the minimal investment
 * TOS21: Cannot unspent more CHF than BASE_TOKEN_PRICE_CHF
 * TOS22: Token transfer must be successfull
 */
contract Tokensale is ITokensale, Operator, Pausable {
  using SafeMath for uint256;

  uint32[5] contributionLimits = [
    0,
    500000,
    1500000,
    10000000,
    25000000
  ];

  /* General sale details */
  IERC20 internal token_;
  address payable internal vaultETH_;
  address internal vaultERC20_;
  IUserRegistry internal userRegistry_;
  IRatesProvider internal ratesProvider_;

  uint256 internal minimalBalance_ = MINIMAL_BALANCE;
  bytes32 internal sharePurchaseAgreementHash_;

  uint256 internal startAt_ = 4102441200;
  uint256 internal endAt_ = 4102441200;
  uint256 internal raisedETH_;
  uint256 internal raisedCHF_;
  uint256 internal totalRaisedCHF_;
  uint256 internal totalUnspentETH_;
  uint256 internal totalRefundedETH_;
  uint256 internal allocatedTokens_;

  struct Investor {
    uint256 unspentETH;
    uint256 investedCHF;
    bool acceptedSPA;
    uint256 allocations;
    uint256 tokens;
  }
  mapping(uint256 => Investor) investors;
  mapping(uint256 => uint256) investorLimits;
  uint256 internal investorCount_;

  /**
   * @dev Throws if sale is not open
   */
  modifier beforeSaleIsOpened {
    require(currentTime() < startAt_, "TOS01");
    _;
  }

  /**
   * @dev Throws if sale is not open
   */
  modifier saleIsOpened {
    require(currentTime() >= startAt_ && currentTime() <= endAt_, "TOS02");
    _;
  }

  /**
   * @dev Throws once the sale is closed
   */
  modifier beforeSaleIsClosed {
    require(currentTime() <= endAt_, "TOS03");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    IUserRegistry _userRegistry,
    IRatesProvider _ratesProvider,
    address _vaultERC20,
    address payable _vaultETH
  ) public
  {
    token_ = _token;
    userRegistry_ = _userRegistry;
    ratesProvider_ = _ratesProvider;
    vaultERC20_ = _vaultERC20;
    vaultETH_ = _vaultETH;
  }

  /**
   * @dev fallback function
   */
  function () external payable {
    require(msg.data.length == 0, "TOS05");
    investETH();
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

  function userRegistry() public view returns (IUserRegistry) {
    return userRegistry_;
  }

  function ratesProvider() public view returns (IRatesProvider) {
    return ratesProvider_;
  }

  function sharePurchaseAgreementHash() public view returns (bytes32) {
    return sharePurchaseAgreementHash_;
  }

  /* Sale status */
  function startAt() public view returns (uint256) {
    return startAt_;
  }

  function endAt() public view returns (uint256) {
    return endAt_;
  }

  function raisedETH() public view returns (uint256) {
    return raisedETH_;
  }

  function raisedCHF() public view returns (uint256) {
    return raisedCHF_;
  }

  function totalRaisedCHF() public view returns (uint256) {
    return totalRaisedCHF_;
  }

  function totalUnspentETH() public view returns (uint256) {
    return totalUnspentETH_;
  }

  function totalRefundedETH() public view returns (uint256) {
    return totalRefundedETH_;
  }

  function availableSupply() public view returns (uint256) {
    uint256 vaultSupply = token_.balanceOf(vaultERC20_);
    uint256 allowance = token_.allowance(vaultERC20_, address(this));
    return (vaultSupply < allowance) ? vaultSupply : allowance;
  }
 
  /* Investor specific attributes */
  function investorUnspentETH(uint256 _investorId)
    public view returns (uint256)
  {
    return investors[_investorId].unspentETH;
  }

  function investorInvestedCHF(uint256 _investorId)
    public view returns (uint256)
  {
    return investors[_investorId].investedCHF;
  }

  function investorAcceptedSPA(uint256 _investorId)
    public view returns (bool)
  {
    return investors[_investorId].acceptedSPA;
  }

  function investorAllocations(uint256 _investorId)
    public view returns (uint256)
  {
    return investors[_investorId].allocations;
  }

  function investorTokens(uint256 _investorId) public view returns (uint256) {
    return investors[_investorId].tokens;
  }

  function investorCount() public view returns (uint256) {
    return investorCount_;
  }

  function investorLimit(uint256 _investorId) public view returns (uint256) {
    return investorLimits[_investorId];
  }

  /**
   * @dev minimal balance
   */
  function minimalAutoWithdraw() public view returns (uint256) {
    return MINIMAL_AUTO_WITHDRAW;
  }

  /**
   * @dev minimal balance
   */
  function minimalBalance() public view returns (uint256) {
    return minimalBalance_;
  }

  /**
   * @dev minimal balance
   */
  function basePriceCHFCent() public view returns (uint256) {
    return BASE_PRICE_CHF_CENT;
  }

  /**
   * @dev contributionLimit
   */
  function contributionLimit(uint256 _investorId)
    public view returns (uint256)
  {
    uint256 kycLevel = userRegistry_.extended(_investorId, KYC_LEVEL_KEY);
    uint256 limit = 0;
    if (kycLevel < 5) {
      limit = contributionLimits[kycLevel];
    } else {
      limit = (investorLimits[_investorId] > 0
        ) ? investorLimits[_investorId] : contributionLimits[4];
    }
    return limit.sub(investors[_investorId].investedCHF);
  }

  /**
   * @dev updateMinimalBalance
   */
  function updateMinimalBalance(uint256 _minimalBalance)
    public onlyOperator returns (uint256)
  {
    minimalBalance_ = _minimalBalance;
  }

  /**
   * @dev define investor limit
   */
  function updateInvestorLimits(uint256[] memory _investorIds, uint256 _limit)
    public onlyOperator returns (uint256)
  {
    for (uint256 i = 0; i < _investorIds.length; i++) {
      investorLimits[_investorIds[i]] = _limit;
    }
  }

  /* Share Purchase Agreement */
  /**
   * @dev define SPA
   */
  function defineSPA(bytes32 _sharePurchaseAgreementHash)
    public onlyOwner returns (bool)
  {
    sharePurchaseAgreementHash_ = _sharePurchaseAgreementHash;
    emit SalePurchaseAgreementHash(_sharePurchaseAgreementHash);
  }

  /**
   * @dev Accept SPA and invest if msg.value > 0
   */
  function acceptSPA(bytes32 _sharePurchaseAgreementHash)
    public beforeSaleIsClosed payable returns (bool)
  {
    require(
      _sharePurchaseAgreementHash == sharePurchaseAgreementHash_, "TOS06");
    uint256 investorId = userRegistry_.userId(msg.sender);
    require(investorId > 0, "TOS07");
    investors[investorId].acceptedSPA = true;
    investorCount_++;

    if (msg.value > 0) {
      investETH();
    }
  }

  /* Investment */
  function investETH() public
    saleIsOpened whenNotPaused payable
  {
    //Accepting SharePurchaseAgreement is temporarily offchain
    //uint256 investorId = userRegistry.userId(msg.sender);
    //require(investors[investorId].acceptedSPA, "TOS08");
    investInternal(msg.sender, msg.value, 0);
    withdrawETHFundsInternal();
  }

  /**
   * @dev add off chain investment
   */
  function addOffChainInvestment(address _investor, uint256 _amountCHF)
    public onlyOperator
  {
    investInternal(_investor, 0, _amountCHF);
  }

  /* Schedule */ 
  /**
   * @dev update schedule
   */
  function updateSchedule(uint256 _startAt, uint256 _endAt)
    public onlyOperator beforeSaleIsOpened
  {
    require(_startAt < _endAt, "TOS09");
    startAt_ = _startAt;
    endAt_ = _endAt;
  }

  /* Allocations admin */
  /**
   * @dev allocate
   */
  function allocateTokens(address _investor, uint256 _amount)
    public onlyOperator beforeSaleIsClosed returns (bool)
  {
    uint256 investorId = userRegistry_.userId(_investor);
    require(investorId > 0, "TOS10");
    Investor storage investor = investors[investorId];
    
    allocatedTokens_ = allocatedTokens_.sub(investor.allocations).add(_amount);
    require(allocatedTokens_ <= availableSupply(), "TOS11");

    investor.allocations = _amount;
    emit Allocation(investorId, _amount);
  }

  /**
   * @dev allocate many
   */
  function allocateManyTokens(address[] memory _investors, uint256[] memory _amounts)
    public onlyOperator beforeSaleIsClosed returns (bool)
  {
    require(_investors.length == _amounts.length, "TOS12");
    for (uint256 i = 0; i < _investors.length; i++) {
      allocateTokens(_investors[i], _amounts[i]);
    }
  }

  /* ETH administration */
  /**
   * @dev fund ETH
   */
  function fundETH() public payable onlyOperator {
    emit FundETH(msg.value);
  }

  /**
   * @dev refund unspent ETH many
   */
  function refundManyUnspentETH(address payable[] memory _receivers) public onlyOperator {
    for (uint256 i = 0; i < _receivers.length; i++) {
      refundUnspentETH(_receivers[i]);
    }
  }

  /**
   * @dev refund unspent ETH
   */
  function refundUnspentETH(address payable _receiver) public onlyOperator {
    uint256 investorId = userRegistry_.userId(_receiver);
    require(investorId != 0, "TOS13");
    Investor storage investor = investors[investorId];

    if (investor.unspentETH > 0) {
      // solium-disable-next-line security/no-send
      require(_receiver.send(investor.unspentETH), "TOS14");
      totalRefundedETH_ = totalRefundedETH_.add(investor.unspentETH);
      emit WithdrawETH(_receiver, investor.unspentETH);
      totalUnspentETH_ = totalUnspentETH_.sub(investor.unspentETH);
      investor.unspentETH = 0;
    }
  }

  /**
   * @dev withdraw ETH funds
   */
  function withdrawETHFunds() public onlyOperator {
    withdrawETHFundsInternal();
  }

  /**
   * @dev withdraw all ETH funds
   */
  function withdrawAllETHFunds() public onlyOperator {
    uint256 balance = address(this).balance;
    // solium-disable-next-line security/no-send
    require(vaultETH_.send(balance), "TOS15");
    emit WithdrawETH(vaultETH_, balance);
  }

  /**
   * @dev allowed token investment
   */
  function allowedTokenInvestment(
    uint256 _investorId, uint256 _contributionCHF)
    public view returns (uint256)
  {
    uint256 tokens = 0;
    uint256 allowedContributionCHF = contributionLimit(_investorId);
    if (_contributionCHF < allowedContributionCHF) {
      allowedContributionCHF = _contributionCHF;
    }
    tokens = allowedContributionCHF.div(BASE_PRICE_CHF_CENT);
    uint256 availableTokens = availableSupply().sub(
      allocatedTokens_).add(investors[_investorId].allocations);
    if (tokens > availableTokens) {
      tokens = availableTokens;
    }
    return tokens;
  }

  /**
   * @dev withdraw ETH funds internal
   */
  function withdrawETHFundsInternal() internal {
    uint256 balance = address(this).balance;

    if (balance > totalUnspentETH_ && balance > minimalBalance_) {
      uint256 amount = balance.sub(minimalBalance_);
      // solium-disable-next-line security/no-send
      require(vaultETH_.send(amount), "TOS15");
      emit WithdrawETH(vaultETH_, amount);
    }
  }

  /**
   * @dev invest internal
   */
  function investInternal(
    address _investor, uint256 _amountETH, uint256 _amountCHF)
    private
  {
    // investment with _amountETH is decentralized
    // investment with _amountCHF is centralized
    // They are mutually exclusive
    bool isInvesting = (
        _amountETH != 0 && _amountCHF == 0
      ) || (
      _amountETH == 0 && _amountCHF != 0
      );
    require(isInvesting, "TOS16");
    require(ratesProvider_.rateWEIPerCHFCent() != 0, "TOS17");
    uint256 investorId = userRegistry_.userId(_investor);
    require(userRegistry_.isValid(investorId), "TOS18");

    Investor storage investor = investors[investorId];

    uint256 contributionCHF = ratesProvider_.convertWEIToCHFCent(
      investor.unspentETH);

    if (_amountETH > 0) {
      contributionCHF = contributionCHF.add(
        ratesProvider_.convertWEIToCHFCent(_amountETH));
    }
    if (_amountCHF > 0) {
      contributionCHF = contributionCHF.add(_amountCHF);
    }

    uint256 tokens = allowedTokenInvestment(investorId, contributionCHF);
    require(tokens != 0, "TOS19");
    require(tokens >= MINIMAL_INVESTMENT, "TOS20");

    /** Calculating unspentETH value **/
    uint256 investedCHF = tokens.mul(BASE_PRICE_CHF_CENT);
    uint256 unspentContributionCHF = contributionCHF.sub(investedCHF);

    uint256 unspentETH = 0;
    if (unspentContributionCHF != 0) {
      if (_amountCHF > 0) {
        // Prevent CHF investment LARGER than available supply
        // from creating a too large and dangerous unspentETH value
        require(unspentContributionCHF < BASE_PRICE_CHF_CENT, "TOS21");
      }
      unspentETH = ratesProvider_.convertCHFCentToWEI(
        unspentContributionCHF);
    }

    /** Spent ETH **/
    uint256 spentETH = 0;
    if (investor.unspentETH == unspentETH) {
      spentETH = _amountETH;
    } else {
      uint256 unspentETHDiff = (unspentETH > investor.unspentETH)
        ? unspentETH.sub(investor.unspentETH)
        : investor.unspentETH.sub(unspentETH);

      if (_amountCHF > 0) {
        if (unspentETH < investor.unspentETH) {
          spentETH = unspentETHDiff;
        }
        // if unspentETH > investor.unspentETH
        // then CHF has been converted into ETH
        // and no ETH were spent
      }
      if (_amountETH > 0) {
        spentETH = (unspentETH > investor.unspentETH)
          ? _amountETH.sub(unspentETHDiff)
          : _amountETH.add(unspentETHDiff);
      }
    }

    totalUnspentETH_ = totalUnspentETH_.sub(
      investor.unspentETH).add(unspentETH);
    investor.unspentETH = unspentETH;
    investor.investedCHF = investor.investedCHF.add(investedCHF);
    investor.tokens = investor.tokens.add(tokens);
    raisedCHF_ = raisedCHF_.add(_amountCHF);
    raisedETH_ = raisedETH_.add(spentETH);
    totalRaisedCHF_ = totalRaisedCHF_.add(investedCHF);

    allocatedTokens_ = allocatedTokens_.sub(investor.allocations);
    investor.allocations = (investor.allocations > tokens)
      ? investor.allocations.sub(tokens) : 0;
    allocatedTokens_ = allocatedTokens_.add(investor.allocations);
    require(
      token_.transferFrom(vaultERC20_, _investor, tokens),
      "TOS22");

    if (spentETH > 0) {
      emit ChangeETHCHF(
        _investor,
        spentETH,
        ratesProvider_.convertWEIToCHFCent(spentETH),
        ratesProvider_.rateWEIPerCHFCent());
    }
    emit Investment(investorId, investedCHF);
  }

  /* Util */
  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solium-disable-next-line security/no-block-members
    return now;
  }
}
