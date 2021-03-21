pragma solidity ^0.8.0;

import "../interface/INFT.sol";
import "../convert/Bytes32Convert.sol";


/**
 * @title TokenNFT contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 * 
 * Error messages
 *   NFT01: Recipient is invalid
 *   NFT02: Sender is not the owner
 *   NFT03: Sender is not approved
 */
contract TokenNFT is INFT {
  using Bytes32Convert for bytes32;

  uint256 constant internal ALL_TOKENS = ~uint256(0);
  uint256 constant internal NO_TOKENS = uint256(0);

  string internal name_;
  string internal symbol_;
  string internal baseURI_;
  string internal extensionURI_;

  uint256 internal totalSupply_;

  struct Owner {
    uint256 balance;
    mapping (uint256 => uint256) ownedTokenIds;
    mapping (uint256 => uint256) ownedTokenIndexes;
    mapping (address => uint256) approvalMasks;
  }

  mapping (uint256 => uint256) internal tokenIds;
  mapping (uint256 => address) internal ownersAddresses;
  mapping (address => Owner) internal owners;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseURI,
    string memory _extensionURI,
    address _initialOwner,
    uint256[] memory _initialTokenIds
  ) {
    name_ = _name;
    symbol_ = _symbol;
    baseURI_ = _baseURI;
    extensionURI_ = _extensionURI;
    totalSupply_ = _initialTokenIds.length;

    Owner storage owner_ = owners[_initialOwner];
    owner_.balance = _initialTokenIds.length;

    for(uint256 i=0; i < _initialTokenIds.length; i++) {
      tokenIds[i] = _initialTokenIds[i];
      ownersAddresses[_initialTokenIds[i]] = _initialOwner;
      owner_.ownedTokenIds[i] = _initialTokenIds[i];
      owner_.ownedTokenIndexes[_initialTokenIds[i]] = i;
      emit Transfer(address(0), _initialOwner, _initialTokenIds[i]);
    }
  }

  function interface165() public pure returns (bytes4) {
    return type(IERC721Enumerable).interfaceId;
  }

  function interface721() public pure returns (bytes4) {
    return type(IERC721Metadata).interfaceId;
  }

  function supportsInterface(bytes4 _interfaceId) public pure override returns (bool) {
    return _interfaceId == type(IERC165).interfaceId
      || _interfaceId == type(IERC721).interfaceId
      || _interfaceId == type(IERC721Enumerable).interfaceId
      || _interfaceId == type(IERC721Metadata).interfaceId;
  }

  function name() external override view returns (string memory) {
    return name_;
  }

  function symbol() external override view returns (string memory) {
    return symbol_;
  }

  function templateURI() external override view
    returns (string memory base, string memory extension)
  {
    return (baseURI_, extensionURI_);
  }

  function totalSupply() external override view returns (uint256) {
    return totalSupply_;
  }

  function tokenURI(uint256 _indexId) external override view returns (string memory) { 
    return string(abi.encodePacked(baseURI_, bytes32(_indexId).toString(), extensionURI_));
  }

  function tokenByIndex(uint256 _index) external override view returns (uint256) {
    return tokenIds[_index];
  }

  function balanceOf(address _owner) external override view returns (uint256) {
    return owners[_owner].balance;
  }

  function tokenOfOwnerByIndex(address _owner, uint256 _index)
    external override view returns (uint256)
  {
    return owners[_owner].ownedTokenIds[_index];
  }

  function ownerOf(uint256 _tokenId) external override view returns (address) {
    return ownersAddresses[_tokenId];
  }

  function approvals(address _owner, address _spender)
    external override view returns (uint256)
  {
    return owners[_owner].approvalMasks[_spender];
  }

  function isApproved(address _owner, address _spender, uint256 _tokenId)
    external override view returns (bool)
  {
    return owners[_owner].approvalMasks[_spender] & _tokenId == _tokenId;
  }

  function isApprovedForAll(address _owner, address _spender)
    external override view returns (bool)
  {
    return owners[_owner].approvalMasks[_spender] == ALL_TOKENS;
  }

  function transfer(address _to, uint256 _tokenId)
    external override returns (bool)
  {
    return transferFromInternal(msg.sender, _to, _tokenId);
  }

  function transferFrom(address _from, address _to, uint256 _tokenId)
    external override returns (bool)
  {
    return transferFromInternal(_from, _to, _tokenId);
  }

  function approve(address _spender, uint256 _tokenId)
    external override returns (bool)
  {
    require(ownersAddresses[_tokenId] == msg.sender, "NFT02");
    owners[msg.sender].approvalMasks[_spender] |= _tokenId;

    emit Approval(msg.sender, _spender, _tokenId);
    return true;
  }

  function setApprovalMask(address _spender, uint256 _mask)
    public override returns (bool)
  {
    owners[msg.sender].approvalMasks[_spender] = _mask;
    emit ApprovalMask(msg.sender, _spender, _mask);
    return true;
  }

  function setApprovalForAll(address _spender, bool _approved)
    external override returns (bool)
  {
    setApprovalMask(_spender, _approved ? ALL_TOKENS : NO_TOKENS);
    emit ApprovalForAll(msg.sender, _spender, _approved);
    return true;
  }

  function transferFromInternal(address _from, address _to, uint256 _tokenId)
    internal returns (bool)
  {
    require(_to != address(0), "NFT01");
    require(ownersAddresses[_tokenId] == _from, "NFT02");
    require(msg.sender == _from ||
      (owners[_from].approvalMasks[_to] & _tokenId == _tokenId), "NFT03");

    ownersAddresses[_tokenId] = _to;

    Owner storage from = owners[_from];
    from.ownedTokenIds[from.ownedTokenIndexes[_tokenId]] =
      from.ownedTokenIds[from.balance-1];
    from.ownedTokenIds[from.balance-1] = 0;
    from.balance--;

    Owner storage to = owners[_to];
    to.ownedTokenIds[to.balance] = _tokenId;
    to.ownedTokenIndexes[_tokenId] = to.balance;
    to.balance++;

    emit Transfer(_from, _to, _tokenId);
    return true;
  }

  function getApproved(uint256)
    external override pure returns (address) {
    revert("NOT_IMPLEMENTED");
  }

  function safeTransferFrom(address, address, uint256)
    external override pure {
    revert("NOT_IMPLEMENTED");
  }

  function safeTransferFrom(address, address, uint256, bytes calldata)
    external override pure {
    revert("NOT_IMPLEMENTED");
  }
}
