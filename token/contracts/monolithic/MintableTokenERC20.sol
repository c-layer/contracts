pragma solidity ^0.6.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "@c-layer/common/contracts/operable/Ownable.sol";
import "../interface/IMintableERC20.sol";


/**
 * @title Mintable Token ERC20
 * @dev Mintable Token ERC20 default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   MT01: Unable to mint
 *   MT02: Invalid number of recipients and amounts
 */
contract MintableTokenERC20 is IMintableERC20, Ownable, TokenERC20 {

  bool internal mintingFinished_;
  uint256 internal allTimeMinted_;

  modifier canMint {
    require(!mintingFinished_, "MT01");
    _;
  }

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) public TokenERC20(
    _name,
    _symbol,
    _decimals,
    address(this),
    0)
  {
    mintInternal(_initialAccount, _initialSupply);
  }

  function mintingFinished() external override view returns (bool) {
    return mintingFinished_;
  }

  function allTimeMinted() external override view returns (uint256) {
    return allTimeMinted_;
  }

  /**
   * @dev Function to burn tokens
   * @param _amount The amount of tokens to burn.
   * @return A boolean that indicates if the operation was successful.
   */
  function burn(uint256 _amount) external override onlyOwner returns (bool)
  {
    totalSupply_ = totalSupply_.sub(_amount);
    balances[msg.sender] = balances[msg.sender].sub(_amount);

    emit Transfer(msg.sender, address(0), _amount);
    emit Burn(msg.sender, _amount);
    return true;
  }

  /**
   * @dev Function to mint all tokens at once
   * @param _recipients The addresses that will receive the minted tokens.
   * @param _amounts The amounts of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address[] memory _recipients, uint256[] memory _amounts)
    external override canMint onlyOwner returns (bool)
  {
    require(_recipients.length == _amounts.length, "MT02");

    bool result = true;
    for (uint256 i=0; i < _recipients.length; i++) {
      result = result && mintInternal(_recipients[i], _amounts[i]);
    }
    return result;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() external override canMint onlyOwner returns (bool)
  {
    mintingFinished_ = true;
    emit FinishMinting();
    return true;
  }

  /**
   * @dev Function to mint tokens internal
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintInternal(address _to, uint256 _amount) internal returns (bool)
  {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    allTimeMinted_ = allTimeMinted_.add(_amount);

    emit Transfer(address(0), _to, _amount);
    emit Mint(_to, _amount);
    return true;
  }
}
