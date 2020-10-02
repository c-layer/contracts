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
    uint64 gracePeriod; // delay between two votes

    uint64 periodOffset; // Offset before the first session period
  
    uint8 maxProposals;
    uint8 maxProposalsOperator;
    uint256 newProposalThreshold;
    uint256 executeResolutionThreshold;
  }

  struct ResolutionRequirement {
    uint256 majority;
    uint256 quorum;
  }

  struct Session {
    uint64 campaignAt;
    uint64 startAt;
    uint64 graceAt;
    uint64 closedAt;
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
    GRACE_PERIOD,
    OFFSET_PERIOD,
    MAX_PROPOSALS,
    MAX_PROPOSALS_OPERATOR,
    NEW_PROPOSAL_THRESHOLD,
    EXECUTE_RESOLUTION_THRESHOLD);

  mapping(address => mapping(bytes4 => ResolutionRequirement)) internal resolutionRequirements;

  uint256 internal sessionsCount_;
  mapping(uint256 => Session) internal sessions;
  mapping(address => uint64) internal lastVotes;
  mapping(address => address) internal delegates;
 
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
}
