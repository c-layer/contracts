pragma solidity >=0.5.0 <0.6.0;

import "./BaseTokenDelegate.sol";
import "../TokenProxy.sol";


/**
 * @title MintableTokenDelegate
 * @dev MintableTokenDelegate contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * MT01: Transfer events must be generated
 * MT02: Token is already minted
 * MT03: Parameters must be same length
 */
contract MintableTokenDelegate is BaseTokenDelegate {

  modifier canMint(address _token) {
    require(!tokens[_token].mintingFinished, "MT02");
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address _token, address _to, uint256 _amount)
    public canMint(_token) returns (bool)
  {
    TokenData storage token = tokens[_token];
    token.totalSupply = token.totalSupply.add(_amount);
    token.balances[_to] = token.balances[_to].add(_amount);
    token.allTimeMinted = token.allTimeMinted.add(_amount);

    require(
      TokenProxy(_token).emitTransfer(address(0), _to, _amount),
      "MT01");
    emit Minted(_token, _amount);
    return true;
  }

  /**
   * @dev Function to burn tokens
   * @param _amount The amount of tokens to burn.
   * @return A boolean that indicates if the operation was successful.
   */
  function burn(address _token, uint256 _amount)
    public returns (bool)
  {
    TokenData storage token = tokens[_token];
    token.totalSupply = token.totalSupply.sub(_amount);
    token.balances[msg.sender] = token.balances[msg.sender].sub(_amount);
    token.allTimeBurned = token.allTimeBurned.add(_amount);

    require(
      TokenProxy(_token).emitTransfer(msg.sender, address(0), _amount),
      "MT01");
    emit Burned(_token, _amount);
    return true;
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
   * @dev Function to mint all tokens at once
   * @param _recipients The addresses that will receive the minted tokens.
   * @param _amounts The amounts of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintAtOnce(address _token, address[] memory _recipients, uint256[] memory _amounts)
    public canMint(_token) returns (bool)
  {
    require(_recipients.length == _amounts.length, "MT03");

    bool result = true;
    for (uint256 i=0; i < _recipients.length; i++) {
      result = result && mint(_token, _recipients[i], _amounts[i]);
    }
    return result && finishMinting(_token);
  }
}
