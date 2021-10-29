pragma solidity ^0.8.0;

import "../interface/ITokenERC721.sol";
import "../interface/IERC721TokenReceiver.sol";
import "../Account.sol";
import "../convert/Uint256Convert.sol";


/**
 * @title TokenERC721 contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 * 
 * Error messages
 *   TN01: Token does not exist
 *   TN02: Recipient is invalid
 *   TN03: The approver must either be the owner or the operator
 *   TN04: The token sender is not the owner
 *   TN05: The sender must either be the owner, the operator or the approvee
 *   TN06: The receiver callback was unsuccessfull
 *   TN07: The token must not exist
 */
contract TokenERC721 is ITokenERC721 {
  using Account for address;
  using Uint256Convert for uint256;

  string internal name_;
  string internal symbol_;
  string internal baseURI_;
  string internal suffixURI_;

  uint256 internal totalSupply_;

  struct Owner {
    uint256 balance;
    mapping (uint256 => uint256) ownedTokenIds;
    mapping (uint256 => uint256) ownedTokenIndexes;
    mapping (address => bool) operators;
  }

  mapping (uint256 => uint256) internal tokenIds;
  mapping (uint256 => address) internal ownersAddresses;
  mapping (address => Owner) internal owners;

  mapping (uint256 => address) internal approvees;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseURI,
    string memory _suffixURI,
    address _initialOwner,
    uint256[] memory _initialTokenIds
  ) {
    name_ = _name;
    symbol_ = _symbol;
    baseURI_ = _baseURI;
    suffixURI_ = _suffixURI;
    emit TemplateURIUpdated(_baseURI, _suffixURI);

    mintInternal(_initialOwner, _initialTokenIds);
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

  function totalSupply() external override view returns (uint256) {
    return totalSupply_;
  }

  function tokenURI(uint256 _indexId) external override view returns (string memory) { 
    return string(abi.encodePacked(baseURI_, _indexId.toString(), suffixURI_));
  }

  function tokenByIndex(uint256 _index) external override view returns (uint256) {
    uint256 tokenId = tokenIds[_index];
    tokenExistsInternal(tokenId);
    return tokenId;
  }

  function balanceOf(address _owner) external override view returns (uint256) {
    require(_owner != address(0), "TN02");
    return owners[_owner].balance;
  }

  function tokenOfOwnerByIndex(address _owner, uint256 _index)
    external override view returns (uint256)
  {
    uint256 tokenId = tokenIds[_index];
    tokenExistsInternal(tokenId);
    require(_owner != address(0), "TN02");
    return owners[_owner].ownedTokenIds[_index];
  }

  function ownerOf(uint256 _tokenId) external override view returns (address) {
    address owner = ownersAddresses[_tokenId];
    require(owner != address(0), "TN02");
    return owner;
  }

  function getApproved(uint256 _tokenId)
    external override view returns (address)
  {
    tokenExistsInternal(_tokenId);
    return approvees[_tokenId];
  }

  function isApprovedForAll(address _owner, address _operator)
    external override view returns (bool)
  {
    return owners[_owner].operators[_operator];
  }

  function transferFrom(address _from, address _to, uint256 _tokenId)
    external override
  {
    transferFromInternal(_from, _to, _tokenId);
  }

  function approve(address _approved, uint256 _tokenId) external override
  {
    address owner = ownersAddresses[_tokenId];
    require(owner == msg.sender || owners[owner].operators[msg.sender], "TN03");
    approvees[_tokenId] = _approved;
    emit Approval(owner, _approved, _tokenId);
  }

  function setApprovalForAll(address _operator, bool _approved)
    external override
  {
    owners[msg.sender].operators[_operator] = _approved;
    emit ApprovalForAll(msg.sender, _operator, _approved);
  }

  function safeTransferFrom(address _from, address _to, uint256 _tokenId)
    external override
  {
    transferFromInternal(_from, _to, _tokenId);
    receiverCallbackInternal(_from, _to, _tokenId, "");
  }

  function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes calldata _data)
    external override
  {
    transferFromInternal(_from, _to, _tokenId);
    receiverCallbackInternal(_from, _to, _tokenId, _data);
  }

  function tokenExistsInternal(uint256 _tokenId) internal view {
    require(ownersAddresses[_tokenId] != address(0), "TN01");
  }

  function mintInternal(address _recipient, uint256[] memory _tokenIds) internal {
    totalSupply_ += _tokenIds.length;

    Owner storage owner_ = owners[_recipient];
    owner_.balance += _tokenIds.length;

    for(uint256 i=0; i < _tokenIds.length; i++) {
      uint256 tokenId = _tokenIds[i];
      require(ownersAddresses[tokenId] == address(0), "TN07");
      tokenIds[i] = tokenId;
      ownersAddresses[tokenId] = _recipient;
      owner_.ownedTokenIds[i] = tokenId;
      owner_.ownedTokenIndexes[tokenId] = i;
      emit Transfer(address(0), _recipient, tokenId);
    }
  }

  function transferFromInternal(address _from, address _to, uint256 _tokenId)
    internal
  {
    tokenExistsInternal(_tokenId);
    require(_to != address(0), "TN02");
    require(ownersAddresses[_tokenId] == _from, "TN04");

    require(_from == msg.sender ||
      approvees[_tokenId] == msg.sender ||
      owners[_from].operators[msg.sender], "TN05");

    if (approvees[_tokenId] != address(0)) {
      approvees[_tokenId] = address(0);
      emit Approval(_from, address(0), _tokenId);
    }

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
  }

  function receiverCallbackInternal(address _from, address _to, uint256 _tokenId, bytes memory _data)
    internal
  {
    if(_to.isContract()) {
      require(IERC721TokenReceiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data)
        == IERC721TokenReceiver.onERC721Received.selector, "TN06");
    }
  }
}
