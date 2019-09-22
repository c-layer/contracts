pragma solidity >=0.5.0 <0.6.0;

import "./Dividend.sol";
import "../rule/RuleEngine.sol";


/**
 * @title DividendRuleEngine
 * @dev DividendRuleEngine contract
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
contract DividendRuleEngine is Dividend, RuleEngine {

  /**
   * @dev constructor
   */
  constructor(IERC20 _token, ITokenCore _tokenCore, IRule[] memory _rules) public
    Dividend(_token, _tokenCore) RuleEngine(_rules)
  {} /* solhint-disable no-empty-blocks */

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
