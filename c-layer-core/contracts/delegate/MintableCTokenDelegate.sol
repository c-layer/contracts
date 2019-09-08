pragma solidity >=0.5.0 <0.6.0;

import "./CTokenDelegate.sol";
import "./MintableTokenDelegate.sol";


/**
 * @title Mintable C Token Delegate
 * @dev C Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract MintableCTokenDelegate is CTokenDelegate, MintableTokenDelegate {
}
