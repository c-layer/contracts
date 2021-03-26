// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../interface/IERC721TokenReceiver.sol";

/*
 * @dev Note: the ERC-165 identifier for this interface is 0x150b7a02.
 */
contract ERC721TokenReceiverMock is IERC721TokenReceiver {

  bytes4 constant private RECEIVER_CALLBACK_SUCCESS =
    bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));

  event ERC721Received(address operator, address from, uint256 tokenId, bytes data);

  /* @notice Handle the receipt of an NFT
   * @dev The ERC721 smart contract calls this function on the recipient
   *      after a `transfer`. This function MAY throw to revert and reject the
   *      transfer. Return of other than the magic value MUST result in the
   *      transaction being reverted.
   *      Note: the contract address is always the message sender.
   * @param _operator The address which called `safeTransferFrom` function
   * @param _from The address which previously owned the token
   * @param _tokenId The NFT identifier which is being transferred
   * @param _data Additional data with no specified format
   * @return `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
   *      unless throwinga
   */
  function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes calldata _data)
    external override returns(bytes4)
  {
    emit ERC721Received(_operator, _from, _tokenId, _data);
    return (_tokenId == 1) ? bytes4(0) : RECEIVER_CALLBACK_SUCCESS;
  }
}
