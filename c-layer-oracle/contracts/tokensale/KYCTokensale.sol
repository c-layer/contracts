pragma solidity >=0.5.0 <0.6.0;

import "./Tokensale.sol";
import "../interface/IUserRegistry.sol";


/**
 * @title KYCTokensale
 * @dev KYCTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 */
contract KYCTokensale is Tokensale {

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
   * @dev constructor
   */
  constructor(IUserRegistry _userRegistry) public
  {
    userRegistry_ = _userRegistry;
  }

  /**
   * @dev user registry
   */
  function userRegistry() public view returns (IUserRegistry) {
    return userRegistry_;
  }

  /**
   * @dev contributionLimit
   */
  function contributionLimit(address _investor)
    public view returns (uint256)
  {
    uint256 investorId = userRegistry_.userId(_investor);
    uint256 kycLevel = userRegistry_.extended(investorId, KYC_LEVEL_KEY);
    uint256 amlLimit = 0;
    if (kycLevel < 5) {
      amlLimit = contributionLimits[kycLevel];
    } else {
      amlLimit = userRegistry_.extended(investorId, AML_LIMIT_KEY);
      amlLimit = (amlLimit > 0) ? amlLimit : contributionLimits[4];
    }
    return amlLimit.sub(investorInternal(_investor).invested);
  }

  /**
   * @dev tokenInvestment
   */
  function tokenInvestment(address _investor, uint256 _amount)
    public view returns (uint256)
  {
    uint256 amlLimit = contributionLimit(_investor);
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
