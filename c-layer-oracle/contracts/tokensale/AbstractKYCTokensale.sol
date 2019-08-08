pragma solidity >=0.5.0 <0.6.0;

import "./Tokensale.sol";
import "../interface/IUserRegistry.sol";


/**
 * @title AbstractKYCTokensale
 * @dev AbstractKYCTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract AbstractKYCTokensale is Tokensale {

  uint256 constant public KYC_LEVEL_KEY = 1;
  uint256 constant public AML_LIMIT_KEY = 2;

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

  /**
   * @dev contributionLimit
   */
  function contributionLimit(uint256 _investorId)
    public view returns (uint256)
  {
    uint256 kycLevel = userRegistry_.extended(_investorId, KYC_LEVEL_KEY);
    uint256 amlLimit = 0;
    if (kycLevel < 5) {
      amlLimit = contributionLimits[kycLevel];
    } else {
      amlLimit = userRegistry_.extended(_investorId, AML_LIMIT_KEY);
      amlLimit = (amlLimit > 0) ? amlLimit : contributionLimits[4];
    }
    return amlLimit.sub(investorIds[_investorId].invested);
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address _investor, uint256 _amount)
    public view returns (uint256)
  {
    uint256 investorId = userRegistry_.userId(_investor);
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
