pragma solidity >=0.5.0 <0.6.0;

import "../util/governance/Operable.sol";
import "../util/math/SafeMath.sol";
import "../token/ProvableOwnershipToken.sol";
import "../interface/IDividend.sol";
import "../interface/IERC20.sol";


/**
 * @title Dividend
 * @dev Dividend contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * DI01: This contract must have access to the funds
 * DI02: Not enough funds have been provided
*/
contract Dividend is IDividend, Operable {
  using SafeMath for uint256;

  // Dividends are distributed proportionnaly to ownership of (token)
  ProvableOwnershipToken internal token_;

  struct DividendRecord {
    // Token to be distributed as dividend
    IERC20 payToken;
    // Address containing the payTokens
    address vault;
    // Amount of payToken to be distributed
    uint256 amount;
    // Total Supply of ProvableOwnershipToken at Dividend distribution time
    uint256 totalSupply;
    // Dividend distribution time
    uint256 createdAt;
    // have the user claimed his dividends
    mapping(address => uint256) claimed;
  }
  mapping(uint256 => DividendRecord) internal dividends;
  uint256 public dividendCount_;

  /**
   * @dev constructor
   */
  constructor(ProvableOwnershipToken _token) public { 
    token_ = _token;
  }

  /**
   * @dev returns the token representing
   * the part of the dividend to be distributed
   */
  function token() public view returns (ProvableOwnershipToken) {
    return token_;
  }

  /**
   * @dev number of dividends which have been created
   */
  function dividendCount() public view returns (uint256) {
    return dividendCount_;
  }

  /**
   * @dev token in which the dividend will be payed
   */
  function dividendPayToken(uint256 _dividendId)
    public view returns (IERC20)
  {
    return dividends[_dividendId].payToken;
  }

  /**
   * @dev  amount of a dividend to be distributed among the parties
   */
  function dividendAmount(uint256 _dividendId)
    public view returns (uint256)
  {
    return dividends[_dividendId].amount;
  }

  /**
   * @dev total supply of dividend
   */
  function dividendTotalSupply(uint256 _dividendId)
    public view returns (uint256)
  {
    return dividends[_dividendId].totalSupply;
  }

  /**
   * @dev dividend creation date
   */
  function dividendCreatedAt(uint256 _dividendId)
    public view returns (uint256)
  {
    return dividends[_dividendId].createdAt;
  }

  /**
   * @dev dividend claimed
   */
  function dividendClaimed(uint256 _dividendId, address _address)
    public view returns (uint256)
  {
    return dividends[_dividendId].claimed[_address];
  }

  /**
   * @dev dividend available
   */
  function dividendAvailable(uint256 _dividendId, address _address)
    public view returns (uint256)
  {
    return evalDividendAvailable(
      _dividendId,
      _address,
      token_.balanceOf(_address)
    );
  }

  /**
   * @dev dividend available with proof
   */
  function dividendAvailableWithProof(
    uint256 _dividendId,
    address _address,
    uint256 _proofId) public view returns (uint256)
  {
    return evalDividendAvailable(
      _dividendId,
      _address,
      token_.checkProof(_address, _proofId, dividends[_dividendId].createdAt)
    );
  }

  /**
   * @dev claim the dividend _dividendId without a proof of ownership
   */
  function claimDividend(uint256 _dividendId) public {
    processDividendDistribution(
      _dividendId,
      dividendAvailable(_dividendId, msg.sender));
  }

  /**
   * @dev claim the dividend _dividendId with a proof of ownership
   */
  function claimDividendWithProof(uint256 _dividendId, uint256 _proofId)
    public
  {
    processDividendDistribution(
      _dividendId,
      dividendAvailableWithProof(_dividendId, msg.sender, _proofId)
    );
  }

  /**
   * @dev create a new dividend
   */
  function createDividend(IERC20 _payToken, address _vault, uint256 _amount)
    public onlyOperator
  {
    require(_payToken.allowance(_vault, address(this)) >= _amount, "DI01");
    require(_payToken.balanceOf(_vault) >= _amount, "DI02");
    dividends[dividendCount_] = DividendRecord(
      _payToken,
      _vault,
      _amount,
      token_.totalSupply(),
      // solhint-disable-next-line not-rely-on-time
      now
    );
    emit DividendAdded(dividendCount_, address(_payToken), _amount);
    dividendCount_++;
  }

  /**
   * @dev number of dividends created
   */
  function updateToken(ProvableOwnershipToken _token) public onlyOperator {
    token_ = _token;
    emit TokenUpdated(token_);
  }

  /**
   * @dev distribute the dividend corresponding to the ownership of the token
   * found for that specific address
   */
  function processDividendDistribution(
    uint256 _dividendId,
    uint256 _amountClaimed) internal
  {
    if (_amountClaimed > 0) {
      DividendRecord storage dividend = dividends[_dividendId];
      if (dividend.payToken.balanceOf(dividend.vault) >= _amountClaimed &&
        dividend.payToken.allowance(
          dividend.vault, address(this)) >= _amountClaimed)
      {
        dividend.payToken.transferFrom(
          dividend.vault, msg.sender, _amountClaimed);
        dividends[_dividendId].claimed[msg.sender] = _amountClaimed;
        emit DividendClaimed(_dividendId, msg.sender, _amountClaimed);
      }
    }
  }

  /**
   * @dev dividend available
   */
  function evalDividendAvailable(
    uint256 _dividendId,
    address _address,
    uint256 _addressBalance) private view returns (uint256)
  {
    DividendRecord storage dividend = dividends[_dividendId];
    if (token_.lastTransactionAt(_address) < dividend.createdAt) {
      uint256 alreadyClaimed = dividends[_dividendId].claimed[_address];
      return _addressBalance.mul(dividend.amount)
        .div(dividend.totalSupply).sub(alreadyClaimed);
    }
    return 0;
  }

  event DividendAdded(uint256 indexed id, address payToken, uint256 amount);
  event DividendClaimed(uint256 indexed id, address indexed holder,
  uint256 amount);
  event TokenUpdated(ProvableOwnershipToken token_);
}
