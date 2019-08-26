pragma solidity >=0.5.0 <0.6.0;

import "../storage/OperableTokenStorage.sol";
import "./BaseTokenCore.sol";


/**
 * @title OperableTokenCore
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableTokenCore is BaseTokenCore, OperableTokenStorage {
}
