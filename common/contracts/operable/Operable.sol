pragma solidity ^0.8.0;

import "./Ownable.sol";


/**
 * @title Operable
 * @dev The Operable contract enable the restrictions of operations to a set of operators
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * OP01: Message sender must be an operator
 * OP02: Address must be an operator
 * OP03: Address must not be an operator
 */
contract Operable is Ownable {

  mapping (address => bool) private operators_;

  /**
   * @dev Throws if called by any account other than the operator
   */
  modifier onlyOperator {
    require(operators_[msg.sender], "OP01");
    _;
  }

  /**
   * @dev constructor
   */
  constructor() {
    operators_[msg.sender] = true;
  }

  /**
   * @dev isOperator
   * @param _address operator address
   */
  function isOperator(address _address) public view returns (bool) {
    return operators_[_address];
  }

  /**
   * @dev removeOperator
   * @param _address operator address
   */
  function removeOperator(address _address) public onlyOwner {
    require(operators_[_address], "OP02");
    operators_[_address] = false;
    emit OperatorRemoved(_address);
  }

  /**
   * @dev defineOperator
   * @param _role operator role
   * @param _address operator address
   */
  function defineOperator(string memory _role, address _address)
    public onlyOwner
  {
    require(!operators_[_address], "OP03");
    operators_[_address] = true;
    emit OperatorDefined(_role, _address);
  }

  event OperatorRemoved(address address_);
  event OperatorDefined(
    string role,
    address address_
  );
}
