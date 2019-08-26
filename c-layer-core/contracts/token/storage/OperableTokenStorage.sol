pragma solidity >=0.5.0 <0.6.0;

import "./OperableStorage.sol";
import "./BaseTokenStorage.sol";


/**
 * @title OperableTokenStorage
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract OperableTokenStorage is BaseTokenStorage, OperableStorage {
}
