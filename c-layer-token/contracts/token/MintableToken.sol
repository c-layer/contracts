pragma solidity >=0.5.0 <0.6.0;

import "./BaseToken.sol";
import "../util/governance/Operable.sol";
import "../interface/IMintable.sol";


/**
 * @title MintableToken
 * @dev MintableToken contract
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Error messages
 * MT01: Token is already minted
*/
contract MintableToken is IMintable, Operable, BaseToken {

  bool public mintingFinished_ = false;

  function mintingFinished() public view returns (bool) {
    return mintingFinished_;
  }

  modifier canMint() {
    require(!mintingFinished_, "MT01");
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _amount
  ) public canMint onlyOperator returns (bool)
  {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() public canMint onlyOperator returns (bool) {
    mintingFinished_ = true;
    emit MintFinished();
    return true;
  }

  /**
   * @dev Function to mint all tokens at once
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintAtOnce(
    address _to,
    uint256 _amount
  ) public canMint onlyOperator returns (bool)
  {
    return mint(_to, _amount) && finishMinting();
  }

  event Mint(address indexed to, uint256 amount);
  event MintFinished();
}
