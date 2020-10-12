pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "@c-layer/token/contracts/interface/ITokenProxy.sol";
import "@c-layer/token/contracts/interface/ITokenCore.sol";
import "../interface/IVotingDefinitions.sol";


/**
 * @title VotingSessionStorage
 * @dev VotingSessionStorage contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
contract VotingSessionStorage is IVotingDefinitions {
  using SafeMath for uint256;

  struct SessionRule {
    uint64 campaignPeriod; // Before it starts, the vote will be locked
    uint64 votingPeriod; // Time period for voters to submit their votes
    uint64 gracePeriod; // delay between two votes

    uint64 periodOffset; // Offset before the first session period
 
    uint8 openProposals;
    uint8 maxProposals;
    uint8 maxProposalsOperator;
    uint256 newProposalThreshold;
    uint256 executeResolutionThreshold;
  }

  struct ResolutionRequirement {
    uint128 majority;
    uint128 quorum;
  }

  struct Session {
    uint64 campaignAt;
    uint64 voteAt;
    uint64 graceAt;
    uint64 closedAt;
    uint8 proposalsCount;
    uint256 participation;
    uint256 totalSupply;

    mapping(uint256 => Proposal) proposals;
  }

  struct Proposal {
    string name;
    string url;
    bytes32 proposalHash;
    address proposedBy;
    address resolutionTarget;
    bytes resolutionAction;

    uint256 approvals;

    ResolutionRequirement requirement;
    bool resolutionExecuted;
    bool cancelled;
 }

 struct Sponsor {
   address address_;
   uint64 until;
 }

  SessionRule internal sessionRule_ = SessionRule(
    CAMPAIGN_PERIOD,
    VOTING_PERIOD,
    GRACE_PERIOD,
    OFFSET_PERIOD,
    OPEN_PROPOSALS,
    MAX_PROPOSALS,
    MAX_PROPOSALS_OPERATOR,
    NEW_PROPOSAL_THRESHOLD,
    EXECUTE_RESOLUTION_THRESHOLD);
  SessionRule internal lockedSessionRule_;

  mapping(address => mapping(bytes4 => ResolutionRequirement)) internal resolutionRequirements;

  uint256 internal currentSessionId_;
  mapping(uint256 => Session) internal sessions;
  mapping(address => uint64) internal lastVotes;
  mapping(address => Sponsor) internal sponsors;
 
  ITokenProxy internal token_;
  ITokenCore internal core_;

  /**
   * @dev currentTime
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
