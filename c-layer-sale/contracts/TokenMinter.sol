pragma solidity >=0.5.0 <0.6.0;

import "./math/SafeMath.sol";
import "./Operator.sol";
import "./interface/IMintableByLot.sol";
import "./interface/ISaleConfig.sol";

/**
 * @title TokenMinter
 * @dev TokenMinter contract
 * The contract explicit the minting process of the Bridge Token
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * TM01: Configuration must be defined
 * TM02: Final token owner must be defined
 * TM03: There should be at least one lot
 * TM04: Must have one vault per lot
 * TM05: Each vault must be defined
 * TM06: Token must be defined
 * TM07: Token has already been defined
 * TM08: Minter must be the token owner
 * TM09: There should be no token supply
 * TM10: Token minting must not be finished
 * TM11: Minters must match tokensale configuration
 * TM12: Tokensale configuration must matched lot definition
 * TM13: Minter is not already configured for the lot
 * TM14: Token must be defined
 * TM15: Amount to mint must be greater than 0
 * TM16: Mintable supply must be greater than amount to mint
 * TM17: Can only finish minting for active minters
 * TM18: No active minters expected for the lot
 * TM19: There should be some remaining supply in the lot
 * TM20: Minting must be successfull
 * TM21: Token minting must not be finished
 * TM22: There should be some unfinished lot(s)
 * TM23: All minting must be processed
 * TM24: Token minting must not be finished
 * TM25: Finish minting must be successfull
 * TM26: Token minting must be finished
*/
contract TokenMinter is IMintableByLot, Operator {
  using SafeMath for uint256;

  struct MintableLot {
    uint256 mintableSupply;
    address vault;
    mapping(address => bool) minters;
    uint8 activeMinters;
  }

  MintableLot[] internal mintableLots;
  mapping(address => uint256) internal minterLotIds;

  uint256 internal totalMintableSupply_;
  address internal finalTokenOwner_;

  uint8 internal activeLots_;

  ISaleConfig internal config_;
  IMintable internal token_;

  /**
   * @dev constructor
   */
  constructor(
    ISaleConfig _config,
    address _finalTokenOwner,
    address[] memory _vaults) public
  {
    require(address(_config) != address(0), "TM01");
    require(_finalTokenOwner != address(0), "TM02");

    uint256[] memory lots = _config.tokensaleLotSupplies();
    require(lots.length > 0, "TM03");
    require(_vaults.length == lots.length, "TM04");

    config_ = _config;
    finalTokenOwner_ = _finalTokenOwner;

    for (uint256 i = 0; i < lots.length; i++) {
      require(_vaults[i] != address(0), "TM05");
      uint256 mintableSupply = lots[i];
      mintableLots.push(MintableLot(mintableSupply, _vaults[i], 0));
      totalMintableSupply_ = totalMintableSupply_.add(mintableSupply);
      activeLots_++;
      emit LotCreated(i+1, mintableSupply);
    }
  }

  /**
   * @dev minter lotId
   */
  function minterLotId(address _minter) public view returns (uint256) {
    return minterLotIds[_minter];
  }

  /**
   * @dev lot mintable supply
   */
  function lotMintableSupply(uint256 _lotId) public view returns (uint256) {
    return mintableLots[_lotId].mintableSupply;
  }

  /**
   * @dev lot vault
   */
  function lotVault(uint256 _lotId) public view returns (address) {
    return mintableLots[_lotId].vault;
  }

  /**
   * @dev is lot minter
   */
  function isLotMinter(uint256 _lotId, address _minter)
    public view returns (bool)
  {
    return mintableLots[_lotId].minters[_minter];
  }

  /**
   * @dev lot active minters
   */
  function lotActiveMinters(uint256 _lotId) public view returns (uint256) {
    return mintableLots[_lotId].activeMinters;
  }

  /**
   * @dev implement IMintable interface
   */
  function mintingFinished() public view returns (bool) {
    return token_.mintingFinished();
  }

  /**
   * @dev setup token and minters
   **/
  function setup(IMintable _token, address[] memory _minters)
    public onlyOwner
  {
    require(address(_token) != address(0), "TM06");
    require(address(token_) == address(0), "TM07");
    // FIXME: Mintable should provide a canMint test function
    // Ensure it has full ownership over the token to ensure
    // that only this contract will be allowed to mint
    // require(_token.owner() == address(this), "TM08");
    token_ = _token;
    
    // FIXME: Mintable should provide a minted test function
    // Ensure that the token has not been premint
    //require(token_.totalSupply() == 0, "TM09");
    require(!token_.mintingFinished(), "TM10");
    
    require(_minters.length == config_.tokensalesCount(), "TM11");
    for (uint256 i = 0; i < _minters.length; i++) {
      if (_minters[i] != address(0)) {
        setupMinter(_minters[i], i);
      }
    }
  }

  /**
   * @dev setup minter
   */
  function setupMinter(address _minter, uint256 _tokensaleId)
    public onlyOwner
  {
    uint256 lotId = config_.lotId(_tokensaleId);
    require(lotId < mintableLots.length, "TM12");
    MintableLot storage lot = mintableLots[lotId];
    require(!lot.minters[_minter], "TM13");
    lot.minters[_minter] = true;
    lot.activeMinters++;
    minterLotIds[_minter] = lotId;
    emit MinterAdded(lotId, _minter);
  }

  /**
   * @dev mint the token from the corresponding lot
   */
  function mint(address _to, uint256 _amount)
    public returns (bool)
  {
    require(address(token_) != address(0), "TM14");
    require(_amount > 0, "TM15");
    
    uint256 lotId = minterLotIds[msg.sender];
    MintableLot storage lot = mintableLots[lotId];

    require(lot.mintableSupply >= _amount, "TM16");

    lot.mintableSupply = lot.mintableSupply.sub(_amount);
    totalMintableSupply_ = totalMintableSupply_.sub(_amount);
    return token_.mint(_to, _amount);
  }

  /**
   * @dev update this contract minting to finish
   */
  function finishMinting() public returns (bool) {
    return finishMintingInternal(msg.sender);
  }

  /**
   * @dev update this contract minting to finish
   */
  function finishMintingRestricted(address _minter)
    public onlyOwner returns (bool)
  {
    return finishMintingInternal(_minter);
  }

  /**
   * @dev update this contract minting to finish
   */
  function finishMintingInternal(address _minter)
    public returns (bool)
  {
    uint256 lotId = minterLotIds[_minter];
    MintableLot storage lot = mintableLots[lotId];
    require(lot.minters[_minter], "TM17");

    lot.minters[_minter] = false;
    lot.activeMinters--;

    if (lot.activeMinters == 0 && lot.mintableSupply == 0) {
      finishLotMintingPrivate(lotId);
    }
    return true;
  }

  /**
   * @dev mint remaining non distributed tokens for a lot
   */
  function mintRemainingLot(uint256 _lotId)
    public returns (bool)
  {
    MintableLot storage lot = mintableLots[_lotId];
    require(lot.activeMinters == 0, "TM18");
    require(lot.mintableSupply > 0, "TM19");

    require(token_.mint(lot.vault, lot.mintableSupply), "TM20");
    totalMintableSupply_ = totalMintableSupply_.sub(lot.mintableSupply);
    lot.mintableSupply = 0;
 
    finishLotMintingPrivate(_lotId);
    return true;
  }

  /**
   * @dev mint remaining non distributed tokens
   * If some token remain unmint (unsold or roundering approximations)
   * they will be minted before the mint can be finished
   **/
  function mintAllRemaining() public onlyOwner returns (bool) {
    require(!token_.mintingFinished(), "TM21");
    require(activeLots_ > 0, "TM22");
   
    if (totalMintableSupply_ > 0) {
      for (uint256 i = 0; i < mintableLots.length; i++) {
        MintableLot storage lot = mintableLots[i];
        if (lot.mintableSupply > 0) {
          mintRemainingLot(i);
        }
      }
    }
    return true;
  }

  /**
   * @dev finish token minting
   */
  function finishTokenMinting() public onlyOwner returns (bool) {
    require(totalMintableSupply_ == 0, "TM23");
    require(!token_.mintingFinished(), "TM24");
    require(token_.finishMinting(), "TM25");
    
    require(token_.mintingFinished(), "TM26");
    
    // FIXME should ownership be transfered or should contract be operator ?
    // token_.transferOwnership(finalTokenOwner_);
    emit TokenReleased();
  }

  /**
   * @dev finish lot minting
   */
  function finishLotMintingPrivate(uint256 _lotId) private {
    activeLots_--;
    emit LotMinted(_lotId);
  }

  event LotCreated(uint256 lotId, uint256 tokenSupply);
  event MinterAdded(uint256 lotId, address minter);
  event LotMinted(uint256 lotId);
  event TokenReleased();
}
