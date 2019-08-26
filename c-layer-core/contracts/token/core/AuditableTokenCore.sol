pragma solidity >=0.5.0 <0.6.0;

import "../storage/AuditableTokenStorage.sol";
import "./OperableTokenCore.sol";


/**
 * @title AuditableTokenCore
 * @dev Auditable token contract
 * Auditable provides transaction data which can be used
 * in other smart contracts
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 **/
contract AuditableTokenCore is OperableTokenCore, AuditableTokenStorage {

}
