pragma solidity ^0.6.0;

import "../factory/Factory.sol";


/**
 * @title FactoryMock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 **/
contract FactoryMock is Factory {

  /**
   * @dev constructor
   */
  constructor() public Factory() {}

  /**
   * @dev define code
   */
  function defineCode(uint256 _id, bytes memory _code)
    public returns (bool)
  {
    return _defineCode(_id, _code);
  }

  /**
   * @dev deploy contract
   */
  function deployContract(uint256 _id, bytes memory _parameters) public returns (address)
  {
    return _deployContract(_id, _parameters);
  }
}
