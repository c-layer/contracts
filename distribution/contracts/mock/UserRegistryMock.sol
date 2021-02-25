pragma solidity ^0.8.0;

import "@c-layer/oracle/contracts/UserRegistry.sol";


/**
 * @title UserRegistry Mock
 * @dev UserRegistry Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract UserRegistryMock is UserRegistry {

  constructor(string memory _name,
    bytes32 _currency, address[] memory _addresses, uint256 _validUntilTime)
    UserRegistry(_name, _currency, _addresses, _validUntilTime)
  {}
}
