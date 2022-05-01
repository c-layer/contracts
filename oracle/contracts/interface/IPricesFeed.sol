pragma solidity ^0.8.0;


/**
 * @title IPricesFeed
 * @dev IPricesFeed interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
abstract contract IPricesFeed {

  function convert(address _fromToken, address _toToken, uint256 _amount)
    virtual external view returns (uint256);
}

