pragma solidity ^0.6.0;

import "../interface/IClaimable.sol";
import "./TokenizedVoting.sol";


/**
 * @title TokenizedVotingClaimable
 * @dev TokenizedVotingClaimable contract
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 */
contract TokenizedVotingClaimable is IClaimable, TokenizedVoting {

  /**
   * @dev constructor
   */
  constructor(ITokenCore _tokenCore) public TokenizedVoting(_tokenCore) { }

  /**
   * @dev implements has claims
   *
   * Returns true if there was at least a vote created after that date
   */
  function hasClaimsSince(address _address, uint256 _at)
    public view returns (bool)
  {
    _address;
    return _at < proposals_[proposalsCount_-1].createdAt;
  }
}
