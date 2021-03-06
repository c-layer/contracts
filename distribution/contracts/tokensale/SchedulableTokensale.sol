pragma solidity ^0.8.0;

import "./BaseTokensale.sol";


/**
 * @title SchedulableTokensale
 * @dev SchedulableTokensale contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * STS01: It must be before the sale is opened
 * STS02: Sale must be open
 * STS03: It must be before the sale is closed
 * STS04: It must start before it ends.
 */
contract SchedulableTokensale is BaseTokensale {

  uint256 internal startAt = ~uint256(0);
  uint256 internal endAt = ~uint256(0);
  bool internal closed;

  event Schedule(uint256 startAt, uint256 endAt);
  event CloseEarly();

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
   * @dev constructor
   */
  constructor(
    IERC20 _token,
    address _vaultERC20,
    address payable _vaultETH,
    uint256 _tokenPrice,
    uint256 _priceUnit
  ) BaseTokensale(_token, _vaultERC20, _vaultETH, _tokenPrice, _priceUnit)
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
    require(_startAt < _endAt, "STS04");
    startAt = _startAt;
    endAt = _endAt;
    emit Schedule(_startAt, _endAt);
  }

  /**
   * @dev close sale
   */
  function closeEarly()
    public onlyOperator beforeSaleIsClosed
  {
    closed = true; 
    emit CloseEarly();
  }

  /* Investment */
  function investInternal(address _investor, uint256 _amount, bool _exactAmountOnly)
    internal override saleIsOpened {
    super.investInternal(_investor, _amount, _exactAmountOnly);
  }

  /* Util */
  /**
   * @dev current time
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
