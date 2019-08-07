pragma solidity >=0.5.0 <0.6.0;

import "./SchedulableTokensale.sol";


/**
 * @title LimitedTokensale
 * @dev LimitedTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * LTS01: Investment must be within the limit
 * LTS02: Min investment must be lower than max
 */
contract LimitedTokensale is SchedulableTokensale {

  uint256 internal investmentMin = 0;
  uint256 internal investmentMax = ~uint256(0);

  /**
   * @dev Throws if amount outside limits
   */
  modifier onlyBoundInvestment(uint256 _amount) {
    require(_amount >= investmentMin && _amount <= investmentMax, "LTS01");
    _;
  }

  function investmentLimit() public view returns (uint256, uint256) {
    return (investmentMin, investmentMax);
  }

  /**
   * @dev update investment limit
   */
  function defineInvestmentLimit(uint256 _min, uint256 _max)
    public onlyOperator beforeSaleIsOpened
  {
    require(_min < _max, "LTS02");
    investmentMin = _min;
    investmentMax = _max;
  }

  /* Investment */
  function investInternal(address _investor, uint256 _amount, bool _refundUnspentETH) internal
    onlyBoundInvestment(_amount)
  {
    investInternal(_investor, _amount, _refundUnspentETH);
  }
}
