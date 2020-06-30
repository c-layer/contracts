pragma solidity ^0.6.0;

import "../interface/ITokenCore.sol";
import "./Voting.sol";


/**
 * @title TokenizedVoting
 * @dev TokenizedVoting contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * TV01: Vote must be opened
 * TV02: Participant must have weight
 */
contract TokenizedVoting is Voting {

  ITokenCore internal tokenCore_;

  /**
   * @dev constructor
   */
  constructor(ITokenCore _tokenCore) public {
    tokenCore_ = _tokenCore;
  }

  /**
   * @dev returns tokenCore
   */
  function tokenCore() public view returns (ITokenCore) {
    return tokenCore_;
  }

  /**
   * @dev votes available from the balance if no transactions was made since
   * the beginning of the vote
   */
  function votesAvailable(uint256 /*_proposalId*/, address /*_holder*/)
    public pure returns (uint256)
  {
    /**if (token.lastTransactionAt(_holder) < proposals[_proposalId].createdAt) {
      return token.balanceOf(_holder);
    }*/
    return 0;
  }

  /**
   * @dev votes available with proof of ownership
   */
  function votesAvailableWithProof(
    uint256 /*_proposalId*/,
    address /*_holder*/,
    uint256 /*_proofId*/) public pure returns (uint256)
  {
    /*return token.checkProof(
      _holder,
      _proofId,
      proposals_[_proposalId].createdAt);*/
    return 0;
  }

  /**
   * @dev vote without proof of ownership
   */
  function vote(uint256 _proposalId, uint8 _option) override public {
    require(isOnGoing(_proposalId), "TV01");
   
    uint256 weight = votesAvailable(_proposalId, msg.sender);
    require(weight != 0, "TV02");
    weightedVote(_proposalId, _option, weight);
  }

  /**
   * @dev vote with proof of ownership
   */
  function voteWithProof(
    uint256 _proposalId,
    uint8 _option,
    uint256 _proofId) public
  {
    require(isOnGoing(_proposalId), "TV01");
   
    uint256 weight = votesAvailableWithProof(
      _proposalId, msg.sender, _proofId);

    require(weight != 0, "TV02");
    weightedVote(_proposalId, _option, weight);
  }

  /**
   * @dev update token
   */
  function updateTokenCore(ITokenCore _tokenCore) public onlyOperator {
    tokenCore_ = _tokenCore;
  }
}
