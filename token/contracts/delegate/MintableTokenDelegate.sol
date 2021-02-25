pragma solidity ^0.8.0;

import "./MintableDelegate.sol";
import "./BaseTokenDelegate.sol";
import "./RuleEngineDelegate.sol";


/**
 * @title Token Delegate
 * @dev Token Delegate
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract MintableTokenDelegate is RuleEngineDelegate, MintableDelegate, BaseTokenDelegate {
}
