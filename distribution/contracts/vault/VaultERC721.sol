pragma solidity ^0.8.0;

import "@c-layer/common/contracts/signer/SignerRecovery.sol";
import "@c-layer/common/contracts/operable/Operable.sol";
import "../interface/IVaultERC721.sol";


/**
 * @title VaultERC721
 * @dev Vault managing ERC721
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract VaultERC721 is IVaultERC721, Operable {
  using SignerRecovery for bytes;

  function transferFromERC721(IERC721 _token, address _from, address _to, uint256 _tokenId)
    public override onlyOperator
  {
    _token.transferFrom(_from, _to, _tokenId);
  }

  function safeTransferFromERC721(IERC721 _token, address _from, address _to, uint256 _tokenId)
    public override onlyOperator
  {
    _token.safeTransferFrom(_from, _to, _tokenId);
  }

  function safeTransferFromERC721(
    IERC721 _token, address _from, address _to, uint256 _tokenId, bytes calldata _data)
    public override onlyOperator
  {
    _token.safeTransferFrom(_from, _to, _tokenId, _data);
  }

  function approveERC721(IERC721 _token, address _approved, uint256 _tokenId)
    public override onlyOperator
  {
    _token.approve(_approved, _tokenId);
  }

  function setApprovalForAllERC721(IERC721 _token, address _operator, bool _approved)
    public override onlyOperator
  {
    _token.setApprovalForAll(_operator, _approved);
  }

  function withdrawERC721WithApproval(IERC721 _token, uint256 _tokenId, uint64 _validity, bytes memory _signature)
    external override
  {
    address signer = _signature.recoverSigner(keccak256(abi.encode(_token, _tokenId, _validity)));
    require(isOperator(signer), "IV01");
    require(_validity < block.timestamp, "IV02");
    _token.transferFrom(address(this), msg.sender, _tokenId);
  }
}
