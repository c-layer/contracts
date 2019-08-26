pragma solidity >=0.5.0 <0.6.0;

import "./OperableTokenStorage.sol";


/**
 * @title SeizableTokenStorage
 * @dev Token which allows owner to seize accounts
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * ST01: Operator cannot seize itself
*/
contract SeizableTokenStorage is OperableTokenStorage {

  // Although very unlikely, the value below may overflow.
  // This contract and his childs should expect it to happened and consider
  // this value as only the first 256 bits of the complete value.
  mapping(address => uint256) public allTimeSeized;

}
