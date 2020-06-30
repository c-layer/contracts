pragma solidity ^0.6.0;

import "../interface/IVoting.sol";
import "./VotingCore.sol";


/**
 * @title Voting
 * @dev Voting contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * VO01: Vote must be closed
 * VO02: Vote must be opened
 */
contract Voting is IVoting, VotingCore {

  struct Rule {
    uint256 duration;
    uint256 minScore;
    uint256 quorum;
  }

  uint256 internal defaultDuration_ = 2 weeks;
  uint256 internal defaultQuorum_ = 0;
  uint256 internal defaultMinScore_ = 0; 

  mapping(uint256 => Rule) internal votingRules_;
  uint256 internal latestVotingTime_;

  /**
   * @dev returns the default duration rule to be used for new votes
   */
  function defaultDuration()
    public view returns (uint256)
  {
    return defaultDuration_;
  }

  /**
   * @dev returns the default Quorum rule to be used for new votes
   */
  function defaultQuorum() public view returns (uint256) {
    return defaultQuorum_;
  }

  /**
   * @dev returns the default minimum score rule to be used for new votes
   */
  function defaultMinScore() public view returns (uint256) {
    return defaultMinScore_;
  }

  /**
   * @dev returns the latest time to vote
   * Allows to quickly know if there are any votes going on.
   */
  function latestVotingTime() public view returns (uint256) {
    return latestVotingTime_;
  }

  /**
   * @dev returns the vote duration rule used in the vote associated with a proposal
   */
  function voteDuration(uint256 _proposalId) public view returns (uint256) {
    return votingRules_[_proposalId].duration;
  }

  /**
   * @dev returns the min participants rule used in the vote associated with a proposal
   */
  function voteQuorum(uint256 _proposalId) public view returns (uint256) {
    return votingRules_[_proposalId].quorum;
  }

  /**
   * @dev returns the min relative majority rule used in the vote associated with a proposal
   */
  function voteMinScore(uint256 _proposalId) public view returns (uint256) {
    return votingRules_[_proposalId].minScore;
  }

  /**
   * @dev return true if the vote associated with the proposalid is on going
   */
  function isOnGoing(uint256 _proposalId) public view returns (bool) {
    return
      currentTime() < proposals_[_proposalId].createdAt.add(
      votingRules_[_proposalId].duration);
  }

  /**
   * @dev return true if there are any votes on going
   *
   * Beware that this method does not take in consideration that the vote 
   * was closed sooner by the contract owner
   */
  function areAnyOnGoing() public view returns (bool) {
    return currentTime() < latestVotingTime_;
  }

  /**
   * @dev provide the result of the vote
   *
   * fails if the vote is still ongoing
   * returns 0 if the quorum or relative majority is not reached
   */
  function result(uint256 _proposalId) public view returns (uint256) {
    require(!isOnGoing(_proposalId), "VO01");
    Proposal storage proposal = proposals_[_proposalId];
    Rule storage rule = votingRules_[_proposalId];

    if (proposal.participation.sub(proposal.ballot[0]) < rule.quorum) {
      return 0;
    }

    uint256 score;
    uint256 first;
    for (uint256 i = 1; i < proposal.ballot.length; i++) {
      if (proposal.ballot[i] > score) {
        first = i;
        score = proposal.ballot[i];
      }
    }

    if (score < rule.minScore) {
      return 0;
    }
    return first;
  }

  /**
   * @dev add a proposal
   */
  function addProposal(
    string memory _summary,
    string memory _url,
    uint256 _hash,
    uint8 _optionsAvailable
  ) public override onlyOperator
  {
    super.addProposal(
      _summary,
      _url,
      _hash,
      _optionsAvailable
    );
    votingRules_[proposalsCount_-1] = Rule(
      defaultDuration_, defaultQuorum_, defaultMinScore_);

    uint256 endVotingTime = proposals_[proposalsCount_-1]
      .createdAt.add(defaultDuration_);

    if (endVotingTime > latestVotingTime_) {
      latestVotingTime_ = endVotingTime;
    }
  }

  /**
   * @dev vote function
   */
  function vote(uint256 _proposalId, uint8 _option) public virtual override {
    require(isOnGoing(_proposalId), "VO02");
    weightedVote(_proposalId, _option, 1);
  }

  /**
   * @dev close vote
   * Does not update latestVotingTime value
   * which will eventually fixed itself
   */
  function closeVote(uint256 _proposalId) public onlyOwner {
    require(isOnGoing(_proposalId), "VO02");

    uint256 newDuration = currentTime() - proposals_[_proposalId].createdAt;
    votingRules_[_proposalId].duration = newDuration;

    emit VoteClosed(_proposalId);
  }

  /**
   * @dev update voting rule
   * Existing votes are not affected by the new rule
   */
  function updateVotingRule(
    uint256 _duration,
    uint256 _quorum,
    uint256 _minScore) public onlyOwner
  {
    defaultDuration_ = _duration;
    defaultQuorum_ = _quorum;
    defaultMinScore_ = _minScore;

    emit VotingRuleUpdated(_duration, _quorum, _minScore);
  }

  /**
   * @dev currentTime
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }

  event VotingRuleUpdated(
  uint256 duration,
  uint256 quorum,
  uint256 minScore);

  event VoteClosed(uint256 proposalId);
}
