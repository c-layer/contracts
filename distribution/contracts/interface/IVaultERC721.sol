pragma solidity ^0.8.0;

import "@c-layer/common/contracts/interface/IERC721.sol";


/**
 * @title IVaultERC721
 * @dev Vault managing ERC721
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
interface IVaultERC721 {

  function transferFromERC721(IERC721 _token, address _from, address _to, uint256 _tokenId) external;
  function safeTransferFromERC721(IERC721 _token, address _from, address _to, uint256 _tokenId) external;
  function safeTransferFromERC721(IERC721 _token, address _from, address _to, uint256 _tokenId, bytes calldata _data) external;

  function approveERC721(IERC721 _token, address _approved, uint256 _tokenId) external;
  function setApprovalForAllERC721(IERC721 _token, address _operator, bool _approved) external;

  function withdrawERC721WithApproval(
    IERC721 _token,
    uint256 _tokenId,
    uint64 _validity,
    bytes memory _signature) external;
}
