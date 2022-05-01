pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "./interface/IPricesFeed.sol";


/**
 * @title PricesFeed
 * @dev PricesFeed contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract PricesFeed is IPricesFeed, Operable {

  address[] internal tokens;
  mapping(address => uint256) internal prices;
  uint64 public updatedAt;

  function definePrices(address[] calldata _tokens, uint256[] calldata _prices) external onlyOperator {
    for(uint256 i=0; i < _tokens.length; i++) {
      prices[_tokens[i]] = _prices[i];
    }
    tokens = _tokens;

    // solhint-disable-next-line not-rely-on-time
    updatedAt = uint64(block.timestamp);
  }

  function updatePrices(uint256[] calldata _prices) external onlyOperator {
    for(uint256 i=0; i < tokens.length; i++) {
      prices[tokens[i]] = _prices[i];
    }

    // solhint-disable-next-line not-rely-on-time
    updatedAt = uint64(block.timestamp);
  }

  function convert(
    address _fromToken,
    address _toToken,
    uint256 _amount) external override view returns (uint256)
  {
    return _amount * prices[_toToken] / prices[_fromToken];
  }
}
