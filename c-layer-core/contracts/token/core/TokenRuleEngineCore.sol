pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenCore.sol";
import "./RuleEngineCore.sol";
import "../interface/IRule.sol";


/**
 * @title TokenRuleEngineCore
 * @dev TokenRuleEngine contract
 * TokenRuleEngine is a token that will apply
 * rules restricting transferability
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract TokenRuleEngineCore is RuleEngineCore, OperableTokenCore {

}
