pragma solidity >=0.5.0 <0.6.0;

import "./CLayerTokenDelegate.sol";
import "./MintableTokenDelegate.sol";


/**
 * @title Payment Token Delegate
 * @dev C Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
// solhint-disable-next-line no-empty-blocks
contract MintableCLayerTokenDelegate is CLayerTokenDelegate, MintableTokenDelegate { }
