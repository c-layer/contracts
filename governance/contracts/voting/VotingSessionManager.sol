pragma solidity ^0.8.0;

import "@c-layer/common/contracts/call/DelegateCall.sol";
import "@c-layer/common/contracts/call/DelegateCallView.sol";
import "../interface/IVotingSessionManager.sol";
import "./VotingSessionStorage.sol";


/**
 * @title VotingSessionManager
 * @dev VotingSessionManager contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VM01: Session doesn't exist
 *   VM02: Token is invalid
 *   VM03: Delegate is invalid
 *   VM04: Token has no valid core
 *   VM05: Only contract owner may define its sponsor
 */
contract VotingSessionManager is IVotingSessionManager, DelegateCallView, VotingSessionStorage {
  using DelegateCall for address;

  modifier onlyOperator() {
    require(core_.hasProxyPrivilege(
      msg.sender, address(this), msg.sig), "VM01");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token, IVotingSessionDelegate _delegate) {
    defineContractsInternal(_token, _delegate);

    resolutionRequirements[ANY_TARGET][ANY_METHOD] =
      ResolutionRequirement(DEFAULT_MAJORITY, DEFAULT_QUORUM, DEFAULT_EXECUTION_THRESHOLD);
  }

  /**
   * @dev token
   */
  function contracts() public override view returns (
    IVotingSessionDelegate delegate, ITokenProxy token, ITokenCore core)
  {
    return (delegate_, token_, core_);
  }

  /**
   * @dev sessionRule
   */
  function sessionRule() public override view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 executionPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    address[] memory nonVotingAddresses) {
    return (
      sessionRule_.campaignPeriod,
      sessionRule_.votingPeriod,
      sessionRule_.executionPeriod,
      sessionRule_.gracePeriod,
      sessionRule_.periodOffset,
      sessionRule_.openProposals,
      sessionRule_.maxProposals,
      sessionRule_.maxProposalsOperator,
      sessionRule_.newProposalThreshold,
      sessionRule_.nonVotingAddresses);
  }

  /**
   * @dev resolutionRequirement
   */
  function resolutionRequirement(address _target, bytes4 _method) public override view returns (
    uint128 majority,
    uint128 quorum,
    uint256 executionThreshold) {
    ResolutionRequirement storage requirement =
      resolutionRequirements[_target][_method];

    return (
      requirement.majority,
      requirement.quorum,
      requirement.executionThreshold);
  }

  /**
   * @dev oldestSessionId
   */
  function oldestSessionId() public override view returns (uint256) {
    return oldestSessionId_;
  }

  /**
   * @dev currentSessionId
   */
  function currentSessionId() public override view returns (uint256) {
    return currentSessionId_;
  }

  /**
   * @dev session
   */
  function session(uint256 _sessionId) public override view returns (
    uint64 campaignAt,
    uint64 voteAt,
    uint64 executionAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 proposalsCount,
    uint256 participation,
    uint256 totalSupply,
    uint256 votingSupply)
  {
    Session storage session_ = sessions[_sessionId];
    return (
      session_.campaignAt,
      session_.voteAt,
      session_.executionAt,
      session_.graceAt,
      session_.closedAt,
      session_.proposalsCount,
      session_.participation,
      session_.totalSupply,
      session_.votingSupply);
  }

  /**
   * @dev sponsorOf
   */
  function sponsorOf(address _voter) public override view returns (address address_, uint64 until) {
    Sponsor storage sponsor_ = sponsors[_voter];
    address_ = sponsor_.address_;
    until = sponsor_.until;
  }

  /**
   * @dev lastVoteOf
   */
  function lastVoteOf(address _voter) public override view returns (uint64 at) {
    return lastVotes[_voter];
  }

  /**
   * @dev proposal
   */
  function proposal(uint256 _sessionId, uint8 _proposalId) public override view returns (
    string memory name,
    string memory url,
    bytes32 proposalHash,
    address resolutionTarget,
    bytes memory resolutionAction)
  {
    Proposal storage proposal_ = sessions[_sessionId].proposals[_proposalId];
    return (
      proposal_.name,
      proposal_.url,
      proposal_.proposalHash,
      proposal_.resolutionTarget,
      proposal_.resolutionAction);
  }

  /**
   * @dev proposalData
   */
  function proposalData(uint256 _sessionId, uint8 _proposalId) public override view returns (
    address proposedBy,
    uint128 requirementMajority,
    uint128 requirementQuorum,
    uint256 executionThreshold,
    uint8 dependsOn,
    uint8 alternativeOf,
    uint256 alternativesMask,
    uint256 approvals)
  {
    Proposal storage proposal_ = sessions[_sessionId].proposals[_proposalId];
    return (
      proposal_.proposedBy,
      proposal_.requirement.majority,
      proposal_.requirement.quorum,
      proposal_.requirement.executionThreshold,
      proposal_.dependsOn,
      proposal_.alternativeOf,
      proposal_.alternativesMask,
      proposal_.approvals);
  }

  /**
   * @dev nextSessionAt
   */
  function nextSessionAt(uint256) public override view returns (uint256) {
    return _delegateCallUint256(address(delegate_));
  }

  /**
   * @dev sessionStateAt
   */
  function sessionStateAt(uint256, uint256) public override
    view returns (SessionState)
  {
    return SessionState(_delegateCallUint256(address(delegate_)));
  }

  /**
   * @dev newProposalThresholdAt
   */
  function newProposalThresholdAt(uint256, uint256)
    public override view returns (uint256)
  {
    return _delegateCallUint256(address(delegate_));
  }

  /**
   * @dev proposalApproval
   */
  function proposalApproval(uint256, uint8)
    public override view returns (bool)
  {
    return _delegateCallBool(address(delegate_));
  }

  /**
   * @dev proposalStateAt
   */
  function proposalStateAt(uint256, uint8, uint256)
    public override view returns (ProposalState)
  {
    return ProposalState(_delegateCallUint256(address(delegate_)));
  }

  /**
   * @dev define contracts
   */
  function defineContracts(ITokenProxy _token, IVotingSessionDelegate _delegate)
    public override onlyOperator() returns (bool)
  {
    return defineContractsInternal(_token, _delegate);
  }

  /**
   * @dev updateSessionRule
   */
  function updateSessionRule(
    uint64, uint64, uint64, uint64, uint64, uint8, uint8, uint8, uint256, address[] memory)
    public override onlyOperator() returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev updateResolutionRequirements
   */
  function updateResolutionRequirements(
    address[] memory, bytes4[] memory, uint128[] memory, uint128[] memory, uint256[] memory)
    public override onlyOperator() returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev defineSponsor
   */
  function defineSponsor(address _sponsor, uint64 _until) public override returns (bool) {
    sponsors[msg.sender] = Sponsor(_sponsor, _until);
    emit SponsorDefined(msg.sender, _sponsor, _until);
    return true;
  }

  /**
   * @dev defineSponsorOf
   */
  function defineSponsorOf(Ownable _contract, address _sponsor, uint64 _until)
    public override returns (bool)
  {
    require(_contract.owner() == msg.sender, "VM05");
    sponsors[address(_contract)] = Sponsor(_sponsor, _until);
    emit SponsorDefined(address(_contract), _sponsor, _until);
    return true;
  }

  /**
   * @dev defineProposal
   */
  function defineProposal(string memory, string memory,
    bytes32, address, bytes memory, uint8, uint8) public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev updateProposal
   */
  function updateProposal(
    uint8, string memory, string memory, bytes32, address, bytes memory, uint8, uint8)
    public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev cancelProposal
   */
  function cancelProposal(uint8) public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev submitVote
   */
  function submitVote(uint256) public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev submitVotesOnBehalf
   */
  function submitVotesOnBehalf(address[] memory, uint256) public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev execute resolutions
   */
  function executeResolutions(uint8[] memory) public override returns (bool)
  {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev archiveSession
   **/
  function archiveSession() public override returns (bool) {
    return address(delegate_)._delegateCall();
  }

  /**
   * @dev define contracts internal
   */
  function defineContractsInternal(ITokenProxy _token, IVotingSessionDelegate _delegate)
    internal returns (bool)
  {
    require(address(_token) != address(0), "VM02");
    require(address(_delegate) != address(0), "VM03");

    ITokenCore core = ITokenCore(_token.core());
    require(address(core) != address(0), "VM04");
    
    if (token_ != _token || core_ != core) {
      token_ = _token;
      core_ = core;
      emit TokenDefined(address(token_), address(core_));
    }

    if (delegate_ != _delegate) {
      delegate_ = _delegate;
      emit DelegateDefined(address(delegate_));
    }
    return true;
  }
}
