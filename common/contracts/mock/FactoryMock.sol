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
    return defineCodeInternal(_id, _code);
  }

  /**
   * @dev deploy contract
   */
  function deployContract(uint256 _id, bytes memory _parameters) public returns (address)
  {
    return deployContractInternal(_id, _parameters);
  }
}
