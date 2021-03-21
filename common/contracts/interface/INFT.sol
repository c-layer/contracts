pragma solidity ^0.8.0;

import "./IERC721Metadata.sol";
import "./IERC721Enumerable.sol";


/**
 * @title INFT interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
interface INFT is IERC721Metadata, IERC721Enumerable {

  event ApprovalMask(address indexed owner, address indexed approvee, uint256 indexed mask);

  function templateURI() external view
    returns (string memory base, string memory extension);

  function isApproved(address _owner, address _spender, uint256 _tokenId)
    external view returns (bool);
  function approvals(address _owner, address _spender)
    external view returns (uint256);

  function transfer(address _to, uint256 _tokenId) external returns (bool);
  function setApprovalMask(address _spender, uint256 _mask) external returns (bool);
}
