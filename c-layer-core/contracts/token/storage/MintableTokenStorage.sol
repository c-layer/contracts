pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenStorage.sol";


/**
 * @title MintableTokenStorage
 * @dev MintableTokenStorage contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 */
contract MintableTokenStorage is OperableTokenStorage {

  mapping(address => bool) public mintingFinished;

}
