pragma solidity >=0.5.0 <0.6.0;

import "./interface/IUserRegistry.sol";
import "./interface/ITokensale.sol";
import "./interface/IRatesProvider.sol";
import "./interface/IERC20.sol";
import "./util/math/SafeMath.sol";
import "./util/lifecycle/Pausable.sol";
import "./util/governance/Operable.sol";


/**
 * @title Tokensale
 * @dev Tokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
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
 * TOS17: A ETH rate must exist to invest
 * TOS18: User must be valid
 * TOS19: Cannot invest if no more tokens
 * TOS20: Investment is below the minimal investment
 * TOS21: Cannot unspent more CHF than basePrice
 * TOS22: Token transfer must be successfull
 * TOS23: Bonus is a percentage
 */
contract Tokensale is ITokensale, Operable, Pausable {
  using SafeMath for uint256;

  uint32[5] internal contributionLimits = [
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

  uint256 internal basePrice_;
  IRatesProvider.Currency internal baseCurrency_;
  uint256 internal minimalBalance_ = MINIMAL_BALANCE;
  bytes32 internal sharePurchaseAgreementHash_;
  uint256 internal bonus_;
  uint256 internal bonusUntil_;

  uint256 internal startAt_ = 4102441200;
  uint256 internal endAt_ = 4102441200;
  uint256 internal raisedETH_;
  uint256 internal raisedBase_;
  uint256 internal totalRaised_;
  uint256 internal totalUnspentETH_;
  uint256 internal totalRefundedETH_;
  uint256 internal allocatedTokens_;

  struct Investor {
    uint256 unspentETH;
    uint256 investedBase;
    bool acceptedSPA;
    uint256 allocations;
    uint256 tokens;
    uint256 bonus;
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
    address payable _vaultETH,
    uint256 _basePrice,
    IRatesProvider.Currency _baseCurrency,
    uint256 _bonus,
    uint256 _bonusUntil,
    uint256 _startAt,
    uint256 _endAt
  ) public
  {
    token_ = _token;
    userRegistry_ = _userRegistry;
    ratesProvider_ = _ratesProvider;
    vaultERC20_ = _vaultERC20;
    vaultETH_ = _vaultETH;
    basePrice_ = _basePrice;
    baseCurrency_ = _baseCurrency;

    updateBonus(_bonus, _bonusUntil);
    updateSchedule(_startAt, _endAt);
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

  function bonus() public view returns (uint256) {
    return bonus_;
  }

  function bonusUntil() public view returns (uint256) {
    return bonusUntil_;
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

  function raisedBase() public view returns (uint256) {
    return raisedBase_;
  }

  function totalRaised() public view returns (uint256) {
    return totalRaised_;
  }

  function totalUnspentETH() public view returns (uint256) {
    return totalUnspentETH_;
  }

  function totalRefundedETH() public view returns (uint256) {
    return totalRefundedETH_;
  }

  function allocatedTokens() public view returns (uint256) {
    return allocatedTokens_;
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

  function investorInvestedBase(uint256 _investorId)
    public view returns (uint256)
  {
    return investors[_investorId].investedBase;
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

  function investorBonus(uint256 _investorId) public view returns (uint256) {
    return investors[_investorId].bonus;
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
   * @dev base price
   */
  function basePrice() public view returns (uint256) {
    return basePrice_;
  }

  /**
   * @dev base currency
   */
  function baseCurrency() public view returns (IRatesProvider.Currency) {
    return baseCurrency_;
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
    return limit.sub(investors[_investorId].investedBase);
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
  function addOffChainInvestment(address _investor, uint256 _amountBase)
    public onlyOperator
  {
    investInternal(_investor, 0, _amountBase);
  }

  /* Bonus */ 
  /**
   * @dev update Bonus
   */
  function updateBonus(uint256 _bonus, uint256 _bonusUntil)
    public onlyOperator beforeSaleIsOpened
  {
    require(_bonus < 100, "TOS23");
    bonus_ = _bonus.add(100);
    bonusUntil_ = _bonusUntil;
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
    uint256 _investorId, uint256 _contributionBase)
    public view returns (uint256, uint256)
  {
    uint256 tokens = 0;
    uint256 tokensBonus = 0;
    uint256 allowedContributionBase = contributionLimit(_investorId);
    if (_contributionBase < allowedContributionBase) {
      allowedContributionBase = _contributionBase;
    }
    tokens = allowedContributionBase.mul(10 ** (token_.decimals())).div(basePrice_);

    if(currentTime() < bonusUntil_) {
      tokensBonus = tokens.mul(bonus_).div(100);
    }

    uint256 availableTokens = availableSupply().sub(
      allocatedTokens_).add(investors[_investorId].allocations);
    if (tokens.add(tokensBonus) > availableTokens) {
      tokensBonus = availableTokens.mul(100).div(bonus_);
      tokens = availableTokens.sub(tokensBonus);
    }
    return (tokens, tokensBonus);
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
    address _investor, uint256 _amountETH, uint256 _amountBase)
    private
  {
    // investment with _amountETH is decentralized
    // investment with _amountBase is centralized
    // They are mutually exclusive
    bool isInvesting = (
        _amountETH != 0 && _amountBase == 0
      ) || (
      _amountETH == 0 && _amountBase != 0
      );
    require(isInvesting, "TOS16");
    require(ratesProvider_.rate(baseCurrency_) != 0, "TOS17");
    uint256 investorId = userRegistry_.userId(_investor);
    require(userRegistry_.isValid(investorId), "TOS18");

    Investor storage investor = investors[investorId];

    uint256 contributionBase = ratesProvider_.convertFromWEI(
      baseCurrency_, investor.unspentETH);

    if (_amountETH > 0) {
      contributionBase = contributionBase.add(
        ratesProvider_.convertFromWEI(baseCurrency_, _amountETH));
    }
    if (_amountBase > 0) {
      contributionBase = contributionBase.add(_amountBase);
    }

    (uint256 tokens, uint256 tokensBonus) = allowedTokenInvestment(investorId, contributionBase);
    require(tokens != 0, "TOS19");
    require(tokens >= MINIMAL_INVESTMENT, "TOS20");

    /** Calculating unspentETH value **/
    uint256 investedBase = tokens.mul(basePrice_).div(10 ** (token_.decimals()));
    uint256 unspentContributionBase = contributionBase.sub(investedBase);

    uint256 unspentETH = 0;
    if (unspentContributionBase != 0) {
      if (_amountBase > 0) {
        // Prevent Base investment LARGER than available supply
        // from creating a too large and dangerous unspentETH value
        require(unspentContributionBase < basePrice_, "TOS21");
      }
      unspentETH = ratesProvider_.convertToWEI(
        baseCurrency_, unspentContributionBase);
    }

    /** Spent ETH **/
    uint256 spentETH = 0;
    if (investor.unspentETH == unspentETH) {
      spentETH = _amountETH;
    } else {
      uint256 unspentETHDiff = (unspentETH > investor.unspentETH)
        ? unspentETH.sub(investor.unspentETH)
        : investor.unspentETH.sub(unspentETH);

      if (_amountBase > 0) {
        if (unspentETH < investor.unspentETH) {
          spentETH = unspentETHDiff;
        }
        // if unspentETH > investor.unspentETH
        // then Base has been converted into ETH
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
    investor.investedBase = investor.investedBase.add(investedBase);
    investor.tokens = investor.tokens.add(tokens);
    investor.bonus = investor.bonus.add(tokensBonus);
    raisedBase_ = raisedBase_.add(_amountBase);
    raisedETH_ = raisedETH_.add(spentETH);
    totalRaised_ = totalRaised_.add(investedBase);

    allocatedTokens_ = allocatedTokens_.sub(investor.allocations);
    //uint256 tokensWithBonus = tokens.add(tokensBonus);
    investor.allocations = (investor.allocations > tokens.add(tokensBonus))
      ? investor.allocations.sub(tokens.add(tokensBonus)) : 0;
    allocatedTokens_ = allocatedTokens_.add(investor.allocations);
    require(
      token_.transferFrom(vaultERC20_, _investor, tokens.add(tokensBonus)),
      "TOS22");

    if (spentETH > 0) {
      emit ChangeETH(
        _investor,
        spentETH,
        ratesProvider_.convertFromWEI(baseCurrency_, spentETH),
        ratesProvider_.rate(baseCurrency_));
    }
    emit Investment(investorId, investedBase);
  }

  /* Util */
  /**
   * @dev current time
   */
  function currentTime() private view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
