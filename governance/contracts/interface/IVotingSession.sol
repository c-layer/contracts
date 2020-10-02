pragma solidity ^0.6.0;

import "@c-layer/token/contracts/interface/ITokenProxy.sol";
import "./IVotingDefinitions.sol";

/**
 * @title IVotingSession
 * @dev IVotingSession interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVotingSession is IVotingDefinitions {

  function token() public virtual view returns (ITokenProxy);
  
  function proposalsCount() public virtual view returns (uint256);

  function proposal(uint256 _proposalId) public virtual view returns (
    uint256 sessionId,
    string memory name,
    string memory url,
    bytes32 proposalHash,
    address proposedBy,
    address resolutionTarget,
    bytes memory resolutionAction,
    uint256 weight,
    uint256 approvals,
    bool resolutionExecuted,
    bool cancelled
  );
  
  function sessionRule() public virtual view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeProposalThreshold);

  function resolutionRequirement(address _target, bytes4 _method) public virtual view returns (
    uint256 majority,
    uint256 quorum);

  function sessionsCount() public virtual view returns (uint256);

  function currentSessionId() public virtual view returns (uint256);

  function session(uint256 _sessionId) public virtual view returns (
    uint64 campaignAt,
    uint64 startAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 sessionProposalsCount,
    uint256 participation);

  function delegate(address _voter) public virtual view returns (address);

  function lastVote(address _voter) public virtual view returns (uint64 at);

  function nextSessionAt(uint256 _time) public virtual view returns (uint256 at);

  function sessionStateAt(uint256 _sessionId, uint256 _time) public virtual view returns (SessionState);

  function isApproved(uint256 _proposalId) public virtual view returns (bool);

  function updateSessionRule(
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _gracePeriod,
    uint64 _periodOffset,
    uint8 _maxProposals,
    uint8 _maxProposalsQuaestor,
    uint256 _newProposalThreshold,
    uint256 _executeResolutionThreshold
  ) public virtual returns (bool);
  
  function updateResolutionRequirements(
    address[] memory _targets,
    bytes4[] memory _methodSignatures,
    uint256[] memory _majority,
    uint256[] memory _quorum
  ) public virtual returns (bool);

  function defineDelegate(address _delegate) public virtual returns (bool);

  function defineProposal(
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction
  ) public virtual returns (bool);

  function updateProposal(
    uint256 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction
  ) public virtual returns (bool);

  function cancelProposal(
    uint256 _proposalId
  ) public virtual returns (bool);

  function submitVote(bool[] memory _votes) public virtual returns (bool);
  function submitVoteForProposals(
    uint256[] memory _proposalIds,
    bool[] memory _votes
  ) public virtual returns (bool);
  function submitVoteOnBehalf(
    uint256[] memory _proposalIds,
    bool[] memory _votes,
    address[] memory _voters
  ) public virtual returns (bool);

  function executeResolution(uint256 _proposalId) public virtual returns (bool);
  function executeManyResolutions(uint256[] memory _proposalIds) public virtual returns (bool);

  event SessionRuleUpdated(
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeResolutionThreshold);

  event ResolutionRequirementUpdated(
    address target,
    bytes4 methodSignature,
    uint256 majority,
    uint256 quorum
  );

  event DelegateDefined(address voter, address delegate);

  event SessionScheduled(uint256 sessionId, uint64 startAt);
  event ProposalDefined(uint256 proposalId);
  event ProposalUpdated(uint256 proposalId);
  event ProposalCancelled(uint256 proposalId);
  event ResolutionExecuted(uint256 proposalId);

  event Vote(uint256 sessionId, address voter, uint256 weight);
  event VoteSecret(uint256 sessionId, address voter);
  event VoteRevealed(uint256 sessionId, address voter);
}
