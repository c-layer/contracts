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

  function sessionRule() virtual public view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 executionPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    address[] memory nonVotingAddresses);

  function resolutionRequirement(address _target, bytes4 _method) virtual public view returns (
    uint128 majority,
    uint128 quorum,
    uint256 executionThreshold);

  function oldestSessionId() virtual public view returns (uint256);

  function currentSessionId() virtual public view returns (uint256);

  function session(uint256 _sessionId) virtual public view returns (
    uint64 campaignAt,
    uint64 voteAt,
    uint64 executionAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 sessionProposalsCount,
    uint256 participation,
    uint256 totalSupply,
    uint256 circulatingSupply);

  function proposal(uint256 _sessionId, uint8 _proposalId) virtual public view returns (
    string memory name,
    string memory url,
    bytes32 proposalHash,
    address resolutionTarget,
    bytes memory resolutionAction);
  function proposalData(uint256 _sessionId, uint8 _proposalId) virtual public view returns (
    address proposedBy,
    uint128 requirementMajority,
    uint128 requirementQuorum,
    uint8 dependsOn,
    uint8 alternativeOf,
    uint256 alternativesMask,
    uint256 approvals);

  function sponsorOf(address _voter) virtual public view returns (address sponsor, uint64 until);

  function lastVoteOf(address _voter) virtual public view returns (uint64 at);

  function nextSessionAt(uint256 _time) virtual public view returns (uint256 at);

  function sessionStateAt(uint256 _sessionId, uint256 _time) virtual public view returns (SessionState);

  function newProposalThresholdAt(uint256 _sessionId, uint256 _proposalsCount)
    virtual public view returns (uint256);

  function proposalApproval(uint256 _sessionId, uint8 _proposalId)
    virtual public view returns (bool);

  function proposalStateAt(uint256 _sessionId, uint8 _proposalId, uint256 _time)
    virtual public view returns (ProposalState);

  function updateSessionRule(
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _executionPeriod,
    uint64 _gracePeriod,
    uint64 _periodOffset,
    uint8 _openProposals,
    uint8 _maxProposals,
    uint8 _maxProposalsQuaestor,
    uint256 _newProposalThreshold,
    address[] memory _nonVotingAddresses
  ) virtual public returns (bool);
  
  function updateResolutionRequirements(
    address[] memory _targets,
    bytes4[] memory _methodSignatures,
    uint128[] memory _majority,
    uint128[] memory _quorum,
    uint256[] memory _executionThreshold
  ) virtual public returns (bool);

  function defineSponsor(address _sponsor, uint64 _until) virtual public returns (bool);
  function defineContractSponsor(address _contract, address _sponsor, uint64 _until)
    virtual public returns (bool);

  function defineProposal(
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf
  ) virtual public returns (bool);

  function updateProposal(
    uint8 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf
  ) virtual public returns (bool);
  function cancelProposal(uint8 _proposalId) virtual public returns (bool);

  function submitVote(uint256 _votes) virtual public returns (bool);
  function submitVoteOnBehalf(
    address[] memory _voters,
    uint256 _votes
  ) virtual public returns (bool);

  function executeResolutions(uint8[] memory _proposalIds) virtual public returns (bool);

  function archiveSession() virtual public returns (bool);

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

  event SponsorDefined(address indexed voter, address address_, uint64 until);

  event SessionScheduled(uint256 indexed sessionId, uint64 voteAt);
  event SessionArchived(uint256 indexed sessionId);
  event ProposalDefined(uint256 indexed sessionId, uint8 proposalId);
  event ProposalUpdated(uint256 indexed sessionId, uint8 proposalId);
  event ProposalCancelled(uint256 indexed sessionId, uint8 proposalId);
  event ResolutionExecuted(uint256 indexed sessionId, uint8 proposalId);

  event Vote(uint256 indexed sessionId, address voter, uint256 weight);
}
