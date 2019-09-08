pragma solidity >=0.5.0 <0.6.0;

import "./CTokenDelegate.sol";
import "./IssuableTokenDelegate.sol";


/**
 * @title Issuable C Token Delegate
 * @dev C Token Delegate
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */
contract IssuableCTokenDelegate is CTokenDelegate, IssuableTokenDelegate {

}
