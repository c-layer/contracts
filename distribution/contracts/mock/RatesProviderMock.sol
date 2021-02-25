pragma solidity ^0.8.0;

import "@c-layer/oracle/contracts/RatesProvider.sol";


/**
 * @title RatesProvider Mock
 * @dev RatesProvider Mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract RatesProviderMock is RatesProvider {

  constructor(string memory _name) RatesProvider(_name) {}
}
