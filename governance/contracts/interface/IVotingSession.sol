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
    uint64 gracePeriod,
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 revealPeriod,
    uint8 maxProposals,
    uint8 maxProposalsQuaestor,
    uint256 newProposalThreshold,
    uint256 defaultMajority,
    uint256 defaultQuorum);

  function resolutionRequirement(bytes4 _method) public virtual view returns (
    uint256 majority,
    uint256 quorum);

  function sessionsCount() public virtual view returns (uint256);
  
  function session(uint256 _sessionId) public virtual view returns (
    uint64 startAt,
    uint256 sessionProposalsCount,
    uint256 participation);

  function lastVote(address _voter) public virtual view returns (uint64 at);
  
  function secretHash(address _voter) public virtual view returns (bytes32);

  function isQuaestor(address _operator) public virtual view returns (bool);

  function sessionStateAt(uint256 _sessionId, uint256 _time) public virtual view returns (SessionState);

  function buildHash(bytes memory _data) public virtual view returns (bytes32);

  function isApproved(uint256 _proposalId) public virtual view returns (bool);

  function updateSessionRule(
    uint64 _gracePeriod,
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _revealPeriod,
    uint8 _maxProposals,
    uint8 _maxProposalsQuaestor,
    uint256 _newProposalThreshold,
    uint256 _defaultMajority,
    uint256 _defaultQuorum
  ) public virtual returns (bool);
  
  function updateResolutionRequirements(
    bytes4[] memory _methodSignatures,
    uint256[] memory _majority,
    uint256[] memory _quorum
  ) public virtual returns (bool);

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
  function submitVoteSecret(bytes32 _secretHash) public virtual returns (bool);
  function revealVoteSecret(bool[] memory _votes, bytes32 _salt) public virtual returns (bool);

  function executeResolution(uint256 _proposalId) public virtual returns (bool);
}
