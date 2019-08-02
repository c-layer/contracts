pragma solidity >=0.5.0 <0.6.0;

import "./Tokensale.sol";


/**
 * @title SchedulableTokensale
 * @dev SchedulableTokensale contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * STS01: It must be before the sale is opened
 * STS02: Sale must be open
 * STS03: It must be before the sale is closed
 * STS04: It must be after the sale is closed
 * STS05: It must start before it ends.
 */
contract SchedulableTokensale is Tokensale {

  uint256 internal startAt = ~uint256(0);
  uint256 internal endAt = ~uint256(0);

  /**
   * @dev Throws if sale is not open
   */
  modifier beforeSaleIsOpened {
    require(currentTime() < startAt, "STS01");
    _;
  }

  /**
   * @dev Throws if sale is not open
   */
  modifier saleIsOpened {
    require(currentTime() >= startAt && currentTime() <= endAt, "STS02");
    _;
  }

  /**
   * @dev Throws once the sale is closed
   */
  modifier beforeSaleIsClosed {
    require(currentTime() <= endAt, "STS03");
    _;
  }

  /**
   * @dev Throws once the sale is closed
   */
  modifier afterSaleIsClosed {
    require(currentTime() <= endAt, "STS04");
    _;
  }

  function schedule() public view returns (uint256, uint256) {
    return (startAt, endAt);
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

  /* Investment */
  function investInternal(address _investor, uint256 _amount) internal
    saleIsOpened
  {
    investInternal(_investor, _amount);
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
