// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC721Metadata.sol";
import "./IERC721Enumerable.sol";
import "./IERC721.sol";

interface ITokenERC721 is IERC721, IERC721Metadata, IERC721Enumerable {

  event TemplateURIUpdated(string baseURI_, string suffixURI_);

  function defineTemplateURI(string memory _baseURI, string memory _suffixURI)
    external;

}
