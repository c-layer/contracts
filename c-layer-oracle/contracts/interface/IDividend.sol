pragma solidity >=0.5.0 <0.6.0;

import "./IERC20.sol";
import "./ITokenCore.sol";


/**
 * @title IDividend
 * @dev IDividend interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
 **/
contract IDividend {

  function token() public view returns (IERC20);
  function dividendsCount() public view returns (uint256);
  function dividendPayToken(uint256 dividendId) public view returns (IERC20);
  function dividendAmount(uint256 dividendId) public view returns (uint256);
  function dividendTotalSupply(uint256 dividendId)
    public view returns (uint256);

  function dividendCreatedAt(uint256 dividendId)
    public view returns (uint256);

  function dividendClaimed(uint256 _dividendId, address _address)
    public view returns (uint256);

  function dividendAvailable(uint256 _dividendId, address _address)
    public view returns (uint256);

  function dividendAvailableWithProof(
    uint256 _dividendId,
    address _address,
    uint256 _proofId
    ) public returns (uint256);

  function claimDividend(uint256 _dividendId) public;
  function claimDividendWithProof(uint256 _dividendId, uint256 _proofId)
    public;

  function createDividend(IERC20 _payToken, address _vault, uint256 _amount)
    public;

  function updateToken(IERC20 _token, ITokenCore _core) public;

  event DividendAdded(uint256 indexed id, address payToken, uint256 amount);
  event DividendClaimed(
  uint256 indexed id,
  uint256 indexed holder,
  uint256 amount);

  event TokenUpdated(IERC20 token);
}
