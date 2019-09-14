pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokensale.sol";


/**
 * @title SchedulableTokensale
 * @dev SchedulableTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * STS01: It must be before the sale is opened
 * STS02: Sale must be open
 * STS03: It must be before the sale is closed
 * STS04: It must be after the sale is closed
 * STS05: It must start before it ends.
 */
contract SchedulableTokensale is BaseTokensale {

  uint256 internal startAt = ~uint256(0);
  uint256 internal endAt = ~uint256(0);
  bool internal closed;

  /**
   * @dev Throws if sale is not open
   */
  modifier beforeSaleIsOpened {
    require(currentTime() < startAt && !closed, "STS01");
    _;
  }

  /**
   * @dev Throws if sale is not open
   */
  modifier saleIsOpened {
    require(
      currentTime() >= startAt
        && currentTime() <= endAt
        && !closed, "STS02"
    );
    _;
  }

  /**
   * @dev Throws once the sale is closed
   */
  modifier beforeSaleIsClosed {
    require(currentTime() <= endAt && !closed, "STS03");
    _;
  }

  /**
   * @dev Throws once the sale is closed
   */
  modifier afterSaleIsClosed {
    require(isClosed(), "STS04");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice
  ) public
    BaseTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice)
  {} /* solhint-disable no-empty-blocks */

  /**
   * @dev schedule
   */
  function schedule() public view returns (uint256, uint256) {
    return (startAt, endAt);
  }

  /**
   * @dev isClosed
   */
  function isClosed() public view returns (bool) {
    return currentTime() > endAt || closed;
  }

  /**
   * @dev update schedule
   */
  function updateSchedule(uint256 _startAt, uint256 _endAt)
    public onlyOperator beforeSaleIsOpened
  {
    require(_startAt < _endAt, "STS05");
    startAt = _startAt;
    endAt = _endAt;
  }

  /**
   * @dev close sale
   */
  function closeEarly()
    public onlyOperator beforeSaleIsClosed
  {
    closed = true; 
  }

  /* Investment */
  function investInternal(address _investor, uint256 _amount, bool _refundUnspentETH) internal
    saleIsOpened
  {
    super.investInternal(_investor, _amount, _refundUnspentETH);
  }

  /* Util */
  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return now;
  }
}
