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
    uint64 executionPeriod; // Time period for executing resolutions
    uint64 gracePeriod; // delay between two votes

    uint64 periodOffset; // Offset before the first session period
 
    uint8 openProposals;
    uint8 maxProposals;
    uint8 maxProposalsOperator;
    uint256 newProposalThreshold;

    address[] nonVotingAddresses;
  }

  struct ResolutionRequirement {
    uint128 majority;
    uint128 quorum;
    uint256 executionThreshold;
  }

  struct Session {
    uint64 campaignAt;
    uint64 voteAt;
    uint64 executionAt;
    uint64 graceAt;
    uint64 closedAt;
    uint8 proposalsCount;
    uint256 participation;
    uint256 totalSupply;
    uint256 circulatingSupply;

    mapping(uint256 => Proposal) proposals;
  }

  // A proposal may be semanticaly in one of the following state:
  // DEFINED, VOTED, RESOLVED(?), PROCESSED
  struct Proposal {
    string name;
    string url;
    bytes32 proposalHash;
    address proposedBy;
    address resolutionTarget;
    bytes resolutionAction;

    ResolutionRequirement requirement;
    uint8 dependsOn; // The previous proposal must be either non approved or executed
    bool resolutionExecuted;
    bool cancelled;
 
    uint8 alternativeOf;
    uint256 approvals;
    uint256 alternativesMask; // only used for the parent alternative proposal
  }

  struct Sponsor {
    address address_;
    uint64 until;
  }

  SessionRule internal sessionRule_ = SessionRule(
    CAMPAIGN_PERIOD,
    VOTING_PERIOD,
    EXECUTION_PERIOD,
    GRACE_PERIOD,
    OFFSET_PERIOD,
    OPEN_PROPOSALS,
    MAX_PROPOSALS,
    MAX_PROPOSALS_OPERATOR,
    NEW_PROPOSAL_THRESHOLD,
    new address[](0)
  );

  mapping(address => mapping(bytes4 => ResolutionRequirement)) internal resolutionRequirements;

  uint256 internal oldestSessionId_ = 1; // '1' simplifies checks when no sessions exists
  uint256 internal currentSessionId_ = 0;
  mapping(uint256 => Session) internal sessions;
  mapping(address => uint64) internal lastVotes;
  mapping(address => Sponsor) internal sponsors;
 
  ITokenProxy internal token_;

  /**
   * @dev currentTime
   */
  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }
}
