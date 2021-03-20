pragma solidity ^0.8.0;


/**
 * @title INFT interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
interface INFT {

  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Approval(address indexed owner, address indexed spender, uint256 indexed tokenId);
  event ApprovalMaskUpdate(
    address indexed owner, address indexed approvee, uint256 indexed mask);

  function name() external view returns (string memory);
  function symbol() external view returns (string memory);
  function baseURI() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function tokenURI(uint256 _indexId) external view returns (string memory);

  function balanceOf(address _owner) external view returns (uint256);
  function ownerOf(uint256 _tokenId) external view returns (address);
  function tokenByIndex(uint256 _index) external view returns (uint256);
  function tokenOfOwnerByIndex(address _owner, uint256 _index)
    external view returns (uint256);

  function approvals(address _owner, address _spender)
    external view returns (uint256);
  function isApproved(address _owner, address _spender, uint256 _tokenId)
    external view returns (bool);
  function isApprovedForAll(address _owner, address _spender)
    external view returns (bool);

  function transfer(address _to, uint256 _tokenId) external returns (bool);
  function transferFrom(address _from, address _to, uint256 _tokenId)
    external returns (bool);

  function approve(address _approved, uint256 _tokenId) external returns (bool);

  function setApprovalMask(address _spender, uint256 _mask) external returns (bool);
}
