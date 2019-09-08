pragma solidity >=0.5.0 <0.6.0;

import "./TokenWithClaimsDelegate.sol";
import "./TokenRuleEngineDelegate.sol";
import "./SeizableTokenDelegate.sol";


/**
 * @title C Token Delegate
 * @dev C Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract CTokenDelegate is TokenWithClaimsDelegate, TokenRuleEngineDelegate, SeizableTokenDelegate {

}
