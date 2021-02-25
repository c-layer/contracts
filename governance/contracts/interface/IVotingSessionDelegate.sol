pragma solidity ^0.8.0;

import "./IVotingSessionStorage.sol";


/**
 * @title IVotingSessionDelegate
 * @dev IVotingSessionDelegate interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVotingSessionDelegate is IVotingSessionStorage {

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
  function submitVotesOnBehalf(
    address[] memory _voters,
    uint256 _votes
  ) virtual public returns (bool);

  function executeResolutions(uint8[] memory _proposalIds) virtual public returns (bool);

  function archiveSession() virtual public returns (bool);

}
