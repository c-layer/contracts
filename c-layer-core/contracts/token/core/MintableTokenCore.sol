pragma solidity >=0.5.0 <0.6.0;

import "../storage/MintableTokenStorage.sol";
import "./OperableTokenCore.sol";


/**
 * @title MintableTokenCore
 * @dev MintableTokenCore contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 *
 * Error messages
 * MT01: Token is already minted
 * MT02: Parameters must be same length
 */
contract MintableTokenCore is OperableTokenCore, MintableTokenStorage {

  modifier canMint(address _token) {
    require(!mintingFinished[_token], "MT01");
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _token,
    address _to,
    uint256 _amount
  ) public canMint(_token) onlyOperator returns (bool)
  {
    BaseTokenData storage baseToken = baseTokens[_token];

    baseToken.totalSupply = baseToken.totalSupply.add(_amount);
    baseToken.balances[_to] = baseToken.balances[_to].add(_amount);
    emit Mint(_token, _to, _amount);
    //emit Transfer(address(0), _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting(address _token)
    public canMint(_token) onlyOperator returns (bool)
  {
    mintingFinished[_token] = true;
    emit MintFinished(_token);
    return true;
  }

  /**
   * @dev Function to mint all tokens at once
   * @param _recipients The addresses that will receive the minted tokens.
   * @param _amounts The amounts of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintAtOnce(
    address _token,
    address[] memory _recipients,
    uint256[] memory _amounts
  ) public canMint(_token) onlyOperator returns (bool)
  {
    require(_recipients.length == _amounts.length, "MT02");

    bool result = true;
    for (uint256 i=0; i < _recipients.length; i++) {
      result = result && mint(_token, _recipients[i], _amounts[i]);
    }
    return result && finishMinting(_token);
  }

  event Mint(address _token, address indexed to, uint256 amount);
  event MintFinished(address _token);
}
