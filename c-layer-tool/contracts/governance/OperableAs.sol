pragma solidity >=0.5.0 <0.6.0;

import "./Operable.sol";


/**
 * @title OperableAs
 * @dev The OperableAs contract enable the restrictions of operations to a set of operators
 * @dev It relies on another Operable contract and reuse the same list of operators
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 *
 * Error messages
 * OA01: Message sender must be an operator
 */
contract OperableAs {

  Operable internal operable_;

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperator {
    require(operable_.isOperator(msg.sender), "OA01");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(Operable _operable) public {
    operable_ = _operable;
  }

  /**
   * @dev isOperator
   */
  function operable() public view returns (Operable) {
    return operable_;
  }

  /**
   * @dev isOperator
   * @param _address operator address
   */
  function isOperator(address _address) public view returns (bool) {
    return operable_.isOperator(_address);
  }
}
