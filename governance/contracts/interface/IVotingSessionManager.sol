pragma solidity ^0.6.0;

import "@c-layer/token/contracts/interface/ITokenProxy.sol";
import "./IVotingDefinitions.sol";

/**
 * @title IVotingSessionManager
 * @dev IVotingSessionManager interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVotingSessionManager is IVotingDefinitions {

  function token() virtual public view returns (ITokenProxy);
  
  function proposal(uint256 _sessionId, uint256 _proposalId) virtual public view returns (
    string memory name,
    string memory url,
    bytes32 proposalHash,
    address resolutionTarget,
    bytes memory resolutionAction);
  function proposalData(uint256 _sessionId, uint256 _proposalId) virtual public view returns (
    address proposedBy,
    uint128 requirementMajority,
    uint128 requirementQuorum,
    uint256 approvals,
    bool resolutionExecuted,
    bool cancelled);
  
  function sessionRule() virtual public view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeProposalThreshold);

  function newProposalThresholdAt(uint256 _sessionId, uint256 _proposalsCount)
    virtual public view returns (uint256);

  function resolutionRequirement(address _target, bytes4 _method) virtual public view returns (
    uint128 majority,
    uint128 quorum);

  function sessionsCount() virtual public view returns (uint256);

  function session(uint256 _sessionId) virtual public view returns (
    uint64 campaignAt,
    uint64 voteAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 sessionProposalsCount,
    uint256 participation,
    uint256 totalSupply);

  function sponsor(address _voter) virtual public view returns (address address_, uint64 until);

  function lastVote(address _voter) virtual public view returns (uint64 at);

  function nextSessionAt(uint256 _time) virtual public view returns (uint256 at);

  function sessionStateAt(uint256 _sessionId, uint256 _time) virtual public view returns (SessionState);

  function isApproved(uint256 _sessionId, uint256 _proposalId) virtual public view returns (bool);

  function updateSessionRule(
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _gracePeriod,
    uint64 _periodOffset,
    uint8 _openProposals,
    uint8 _maxProposals,
    uint8 _maxProposalsQuaestor,
    uint256 _newProposalThreshold,
    uint256 _executeResolutionThreshold
  ) virtual public returns (bool);
  
  function updateResolutionRequirements(
    address[] memory _targets,
    bytes4[] memory _methodSignatures,
    uint128[] memory _majority,
    uint128[] memory _quorum
  ) virtual public returns (bool);

  function defineSponsor(address _address, uint64 _until) virtual public returns (bool);

  function defineProposal(
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction
  ) virtual public returns (bool);

  function updateProposal(
    uint256 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction
  ) virtual public returns (bool);
  function cancelProposal(uint256 _proposalId) virtual public returns (bool);

  function submitVote(uint256 _votes) virtual public returns (bool);
  function submitVoteOnBehalf(
    address[] memory _voters,
    uint256 _votes
  ) virtual public returns (bool);

  function executeResolutions(uint256[] memory _proposalIds) virtual public returns (bool);

  event SessionRuleUpdated(
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeResolutionThreshold);

  event ResolutionRequirementUpdated(
    address target,
    bytes4 methodSignature,
    uint128 majority,
    uint128 quorum
  );

  event SponsorDefined(address indexed voter, address address_, uint64 until);

  event SessionScheduled(uint256 indexed sessionId, uint64 voteAt);
  event ProposalDefined(uint256 indexed sessionId, uint256 proposalId);
  event ProposalUpdated(uint256 indexed sessionId, uint256 proposalId);
  event ProposalCancelled(uint256 indexed sessionId, uint256 proposalId);
  event ResolutionExecuted(uint256 indexed sessionId, uint256 proposalId);

  event Vote(uint256 indexed sessionId, address voter, uint256 weight);
  event VoteSecret(uint256 indexed sessionId, address voter);
  event VoteRevealed(uint256 indexed sessionId, address voter);
}
