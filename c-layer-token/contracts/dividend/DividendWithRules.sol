pragma solidity >=0.5.0 <0.6.0;

import "../ownership/Ownable.sol";
import "../math/SafeMath.sol";
import "../token/ProvableOwnershipToken.sol";
import "./Dividend.sol";
import "../rule/WithRules.sol";


/**
 * @title DividendWithRules
 * @dev DividendWithRules contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract DividendWithRules is Dividend, WithRules {

  /**
   * @dev constructor
   */
  constructor(ProvableOwnershipToken _token, IRule[] memory _rules) public
    Dividend(_token) WithRules(_rules)
  { }

  /**
   * @dev claim the next dividend without a proof of ownership
   */
  function claimDividend(uint256 _dividendId) public
    whenAddressRulesAreValid(msg.sender)
  {
    super.claimDividend(_dividendId);
  }

  /**
   * @dev claim the next dividend with a proof of ownership
   */
  function claimDividendWithProof(uint256 _dividendId, uint256 _proofId) public
    whenAddressRulesAreValid(msg.sender)
  {
    super.claimDividendWithProof(_dividendId, _proofId);
  }
}
