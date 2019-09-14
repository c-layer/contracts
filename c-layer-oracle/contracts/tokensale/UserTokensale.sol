pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokensale.sol";
import "../interface/IUserRegistry.sol";


/**
 * @title UserTokensale
 * @dev UserTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract UserTokensale is BaseTokensale {

  uint256 constant public KYC_LEVEL_KEY = 0;
  uint256 constant public AML_LIMIT_KEY = 1;

  uint32[5] internal contributionLimits = [
    0,
    300000,
    1500000,
    10000000,
    100000000
  ];

  mapping(uint256 => Investor) internal investorIds;
  IUserRegistry internal userRegistry_;

  /**
   * @dev user registry
   */
  function userRegistry() public view returns (IUserRegistry) {
    return userRegistry_;
  }

  function registredInvestorUnspentETH(uint256 _investorId)
    public view returns (uint256)
  {
    return investorIds[_investorId].unspentETH;
  }

  function registredInvestorInvested(uint256 _investorId)
    public view returns (uint256)
  {
    return investorIds[_investorId].invested;
  }

  function registredInvestorTokens(uint256 _investorId)
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
    uint256 kycLevel = userRegistry_.extended(_investorId, KYC_LEVEL_KEY);
    uint256 amlLimit = userRegistry_.extended(_investorId, AML_LIMIT_KEY);
    amlLimit = (amlLimit > 0) ? amlLimit : contributionLimits[kycLevel];

    return amlLimit.sub(investorIds[_investorId].invested);
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address _investor, uint256 _amount)
    public view returns (uint256)
  {
    uint256 investorId = userRegistry_.validUserId(_investor);
    uint256 amlLimit = contributionLimit(investorId);
    return super.tokenInvestment(_investor, (_amount < amlLimit) ? _amount : amlLimit);
  }

  /**
   * @dev investor internal
   */
  function investorInternal(address _investor)
    internal view returns (Investor storage)
  {
    return investorIds[userRegistry_.userId(_investor)];
  }
}
