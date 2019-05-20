pragma solidity >=0.5.0 <0.6.0;


/**
 * @title ISaleConfig interface
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */
contract ISaleConfig {

  struct Tokensale {
    uint256 lotId;
    uint256 tokenPriceCHFCent;
  }

  function tokenSupply() public pure returns (uint256);
  function tokensaleLotSupplies() public view returns (uint256[] memory);

  function tokenizedSharePercent() public pure returns (uint256); 
  function tokenPriceCHF() public pure returns (uint256);

  function minimalCHFInvestment() public pure returns (uint256);
  function maximalCHFInvestment() public pure returns (uint256);

  function tokensalesCount() public view returns (uint256);
  function lotId(uint256 _tokensaleId) public view returns (uint256);
  function tokenPriceCHFCent(uint256 _tokensaleId)
    public view returns (uint256);
}
