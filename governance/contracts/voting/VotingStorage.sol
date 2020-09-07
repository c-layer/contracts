pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "@c-layer/token/contracts/interface/ITokenProxy.sol";
import "@c-layer/token/contracts/interface/ITokenCore.sol";
import "../interface/IVotingDefinitions.sol";


/**
 * @title VotingStorage
 * @dev VotingStorage contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract VotingStorage is IVotingDefinitions {
  using SafeMath for uint256;

  struct SessionRule {
    uint64 campaignPeriod; // Before it starts, the vote will be locked
    uint64 votingPeriod; // Time period for voters to submit their votes
    uint64 revealPeriod; // Once the vote is closed, secret voters may have an additionnal delay to reveal their existing votes
    uint64 gracePeriod; // delay between two votes
  
    uint8 maxProposals;
    uint8 maxProposalsQuaestor;
    uint256 newProposalThreshold;

    uint256 defaultMajority;
    uint256 defaultQuorum;
  }

  struct ResolutionRequirement {
    uint256 majority;
    uint256 quorum;
  }

  struct Session {
    uint64 startAt;
    uint256 proposalsCount;
    uint256 participation;
  }

  struct Proposal {
    uint256 sessionId;

    string name;
    string url;
    bytes32 proposalHash;
    address proposedBy;
    address resolutionTarget;
    bytes resolutionAction;

    uint256 weight;
    uint256 approvals;

    bool resolutionExecuted;
    bool cancelled;
 }

  SessionRule internal sessionRule_ = SessionRule(
    CAMPAIGN_PERIOD,
    VOTING_PERIOD,
    REVEAL_PERIOD,
    GRACE_PERIOD,
    MAX_PROPOSALS,
    MAX_PROPOSALS_QUAESTOR,
    NEW_PROPOSAL_THRESHOLD,
    DEFAULT_MAJORITY,
    DEFAULT_QUORUM);

  mapping(bytes4 => ResolutionRequirement) internal resolutionRequirements;

  uint256 internal sessionsCount_;
  mapping(uint256 => Session) internal sessions;
  mapping(address => uint64) internal lastVotes;
  mapping(address => bytes32) internal secretHashes;
 
  ITokenProxy internal token_;
  ITokenCore internal core_;

  uint256 internal proposalsCount_;
  mapping(uint256 => Proposal) internal proposals;

  /**
   * @dev currentTime
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }

  event SessionRuleUpdated(
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 revealPeriod,
    uint64 gracePeriod,
    uint8 maxProposals,
    uint8 maxProposalsQuaestor,
    uint256 newProposalThreshold,
    uint256 defaultMajority,
    uint256 defaultQuorum);

  event ResolutionRequirementUpdated(
    bytes4 methodSignature,
    uint256 majority,
    uint256 quorum
  );

  event SessionScheduled(uint256 sessionId, uint64 startAt);
  event ProposalDefined(uint256 proposalId);
  event ProposalUpdated(uint256 proposalId);
  event ProposalCancelled(uint256 proposalId);
  event ResolutionExecuted(uint256 proposalId);

  event Vote(uint256 sessionId, address voter, uint256 weight);
  event VoteSecret(uint256 sessionId, address voter);
  event VoteRevealed(uint256 sessionId, address voter);
}
