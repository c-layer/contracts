pragma solidity >=0.5.0 <0.6.0;

import "./WithClaimsTokenDelegate.sol";
import "./RuleEngineTokenDelegate.sol";
import "./SeizableTokenDelegate.sol";
import "./FreezableTokenDelegate.sol";
import "./LockableTokenDelegate.sol";


/**
 * @title C-Layer Token Delegate
 * @dev C-Layer Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
// solhint-disable-next-line no-empty-blocks
contract CLayerTokenDelegate is WithClaimsTokenDelegate,
  RuleEngineTokenDelegate,
  SeizableTokenDelegate,
  FreezableTokenDelegate,
  LockableTokenDelegate { }
