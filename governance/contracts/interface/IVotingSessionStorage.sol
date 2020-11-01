pragma solidity ^0.6.0;

import "./IVotingDefinitions.sol";


/**
 * @title IVotingSessionStorage
 * @dev IVotingSessionStorage interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVotingSessionStorage is IVotingDefinitions {

  event SessionRuleUpdated(
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 executionPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    address[] nonVotingAddresses);
  event ResolutionRequirementUpdated(
    address target,
    bytes4 methodSignature,
    uint128 majority,
    uint128 quorum,
    uint256 executionThreshold
  );

  event TokenDefined(address token, address core);
  event DelegateDefined(address delegate);

  event SponsorDefined(address indexed voter, address address_, uint64 until);

  event SessionScheduled(uint256 indexed sessionId, uint64 voteAt);
  event SessionArchived(uint256 indexed sessionId);
  event ProposalDefined(uint256 indexed sessionId, uint8 proposalId);
  event ProposalUpdated(uint256 indexed sessionId, uint8 proposalId);
  event ProposalCancelled(uint256 indexed sessionId, uint8 proposalId);
  event ResolutionExecuted(uint256 indexed sessionId, uint8 proposalId);

  event Vote(uint256 indexed sessionId, address voter, uint256 weight);
}
