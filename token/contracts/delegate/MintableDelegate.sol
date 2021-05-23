pragma solidity ^0.8.0;

import "../TokenStorage.sol";
import "../TokenProxy.sol";


/**
 * @title MintableDelegate
 * @dev MintableDelegate contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * MT01: Token is already minted
 * MT02: Cannot burn more tokens than owned by the operator
 * MT03: Transfer events must be generated
 * MT04: Parameters must be same length
 */
abstract contract MintableDelegate is TokenStorage {

  modifier canMint(address _token) {
    require(!tokens[_token].mintingFinished, "MT01");
    _;
  }

  /**
   * @dev Function to burn tokens
   * @param _amount The amount of tokens to burn.
   * @return A boolean that indicates if the operation was successful.
   */
  function burn(address _token, uint256 _amount)
    public virtual returns (bool)
  {
    TokenData storage token = tokens[_token];
    require(_amount <= token.balances[msg.sender], "MT02");
    token.totalSupply = token.totalSupply - _amount;
    token.balances[msg.sender] = token.balances[msg.sender] - _amount;
    token.allTimeBurned = token.allTimeBurned + _amount;

    require(
      TokenProxy(_token).emitTransfer(msg.sender, address(0), _amount),
      "MT03");
    emit Burned(_token, _amount);
    return true;
  }

  /**
   * @dev Function to mint all tokens at once
   * @param _recipients The addresses that will receive the minted tokens.
   * @param _amounts The amounts of tokens to mint.
   * @return success The boolean that indicates if the operation was successful.
   */
  function mint(address _token, address[] memory _recipients, uint256[] memory _amounts)
    public virtual canMint(_token) returns (bool success)
  {
    require(_recipients.length == _amounts.length, "MT04");

    success = true;
    for (uint256 i=0; i < _recipients.length && success; i++) {
      success = mintInternal(_token, _recipients[i], _amounts[i]);
    }
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting(address _token)
    public canMint(_token) returns (bool)
  {
    tokens[_token].mintingFinished = true;
    emit MintFinished(_token);
    return true;
  }

  /**
   * @dev Function to mint tokens internal
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintInternal(address _token, address _to, uint256 _amount)
    virtual internal returns (bool)
  {
    TokenData storage token = tokens[_token];
    token.totalSupply = token.totalSupply + _amount;
    token.balances[_to] = token.balances[_to] + _amount;
    token.allTimeMinted = token.allTimeMinted + _amount;

    require(
      TokenProxy(_token).emitTransfer(address(0), _to, _amount),
      "MT03");
    emit Minted(_token, _amount);
    return true;
  }
}
