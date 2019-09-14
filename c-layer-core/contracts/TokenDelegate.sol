pragma solidity >=0.5.0 <0.6.0;

import "./delegate/CLayerTokenDelegate.sol";
import "./delegate/MintableTokenDelegate.sol";


/**
 * @title  Token Delegate
 * @dev C Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
// solhint-disable-next-line no-empty-blocks
contract TokenDelegate is CLayerTokenDelegate, MintableTokenDelegate { }
