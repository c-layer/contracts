pragma solidity ^0.8.0;

import "@c-layer/oracle/contracts/interface/IUserRegistry.sol";
import "./ChangeTokensale.sol";


/**
 * @title UserTokensale
 * @dev UserTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract UserTokensale is ChangeTokensale {

  uint256[] public extendedKeys = [ 0, 1 ]; // KYC Level and AML Limit

  // Default investment based on the KYC Level.
  // Example [ 0, 300000, 1500000, 10000000, 100000000 ];
  uint256[] internal contributionLimits_ = new uint256[](0);

  mapping(uint256 => Investor) internal investorIds;
  IUserRegistry internal userRegistry_;

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    uint256 _priceUnit
  ) ChangeTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
  {}

  /**
   * @dev define contributionLimits
   */
  function defineContributionLimits(uint256[] memory _contributionLimits)
    public onlyOperator returns (bool)
  {
    contributionLimits_ = _contributionLimits;
    emit ContributionLimits(_contributionLimits);
    return true;
  }

  /**
   * @dev contributionsLimit
   */
  function contributionLimits() public view returns (uint256[] memory) {
    return contributionLimits_;
  }

  /**
   * @dev user registry
   */
  function userRegistry() public view returns (IUserRegistry) {
    return userRegistry_;
  }

  function registeredInvestorUnspentETH(uint256 _investorId)
    public view returns (uint256)
  {
    return investorIds[_investorId].unspentETH;
  }

  function registeredInvestorInvested(uint256 _investorId)
    public view returns (uint256)
  {
    return investorIds[_investorId].invested;
  }

  function registeredInvestorTokens(uint256 _investorId)
    public view returns (uint256)
  {
    return investorIds[_investorId].tokens;
  }

  function investorCount()
    public view returns (uint256)
  {
    return userRegistry_.userCount();
  }

  /**
   * @dev contributionLimit
   */
  function contributionLimit(uint256 _investorId)
    public view returns (uint256)
  {
    uint256 amlLimit = 0;

    uint256[] memory extended = userRegistry_.manyExtended(_investorId, extendedKeys);
    uint256 kycLevel = extended[0];
    uint256 baseAmlLimit = extended[1];

    if (baseAmlLimit > 0) {
      amlLimit = ratesProvider_.convert(
        baseAmlLimit, userRegistry_.currency(), baseCurrency_);
    }

    if (amlLimit == 0 && kycLevel < contributionLimits_.length) {
      amlLimit = contributionLimits_[kycLevel];
    }

    return amlLimit - investorIds[_investorId].invested;
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address _investor, uint256 _amount)
    override public view returns (uint256)
  {
    uint256 investorId = userRegistry_.validUserId(_investor);
    uint256 amlLimit = contributionLimit(investorId);
    return super.tokenInvestment(_investor, (_amount < amlLimit) ? _amount : amlLimit);
  }

  /**
   * @dev investor internal
   */
  function investorInternal(address _investor)
    internal override view returns (Investor storage)
  {
    return investorIds[userRegistry_.userId(_investor)];
  }

  event ContributionLimits(uint256[] contributionLimits);
}
