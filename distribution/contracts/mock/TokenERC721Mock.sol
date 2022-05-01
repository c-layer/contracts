pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC721.sol";

/**
 * @title Token ERC721 mock
 * @dev Token ERC721 mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract TokenERC721Mock is TokenERC721 {

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseURI,
    string memory _suffixURI,
    address _initialAccount,
    uint256[] memory _tokenIds
  ) TokenERC721(_name, _symbol, _baseURI, _suffixURI, _initialAccount, _tokenIds) {}
}
