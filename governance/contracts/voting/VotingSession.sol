pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/OperableAsCore.sol";
import "../interface/IVotingSession.sol";
import "./VotingStorage.sol";


/**
 * @title VotingSession
 * @dev VotingSession contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VS01: Only the contract can call it
 *   VS02: Not the proposal author
 *   VS03: Session doesn't exist
 *   VS04: Proposal doesn't exist
 *   VS05: Inconsistent numbers of min participations
 *   VS06: Inconsistent numbers of quorums
 *   VS07: Not enought tokens for a new proposal
 *   VS08: Too many proposals yet for this session
 *   VS09: The session is not in PLANNED state
 *   VS10: The proposal is cancelled
 *   VS11: The voter has already voted
 *   VS12: Inconsistent votes number
 *   VS13: Session is not in VOTING state
 *   VS14: Session is not in REVEAL state
 *   VS15: Session is not in GRACE state
 *   VS16: The resolution is already executed
 *   VS17: The resolution failed
 *   VS18: The provided salt does not match the secret hash
 *   VS19: The resolution has not been approved
 *   VS20: Default majority and quorum cannot be null
 *   VS21: Token must have a valid core
 *   VS22: Token must be successfully locked
 */
contract VotingSession is VotingStorage, IVotingSession, OperableAsCore {

  modifier onlyContract {
    require(msg.sender == address(this), "VS01");
    _;
  }

  modifier onlyProposalAuthor(uint256 _proposalId) {
    require(msg.sender == proposals[_proposalId].proposedBy, "VS02");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token) public {
    token_ = _token;
    core_ = ITokenCore(token_.core());
    require(address(core_) != address(0), "VS21");
 }

  /**
   * @dev sessionRule
   */
  function sessionRule() public override view returns (
    uint64 gracePeriod,
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 revealPeriod,
    uint8 maxProposals,
    uint8 maxProposalsQuaestor,
    uint256 newProposalThreshold,
    uint256 defaultMajority,
    uint256 defaultQuorum) {
    return (
      sessionRule_.gracePeriod,
      sessionRule_.campaignPeriod,
      sessionRule_.votingPeriod,
      sessionRule_.revealPeriod,
      sessionRule_.maxProposals,
      sessionRule_.maxProposalsQuaestor,
      sessionRule_.newProposalThreshold,
      sessionRule_.defaultMajority,
      sessionRule_.defaultQuorum);
  }

  /**
   * @dev resolutionRequirement
   */
  function resolutionRequirement(bytes4 _method) public override view returns (
    uint256 majority,
    uint256 quorum) {
    ResolutionRequirement storage requirement =
      resolutionRequirements[_method];

    return (
      requirement.majority,
      requirement.quorum);
  }

  /**
   * @dev sessionsCount
   */
  function sessionsCount() public override view returns (uint256) {
    return sessionsCount_;
  }

  /**
   * @dev session
   */
  function session(uint256 _sessionId) public override view returns (
    uint64 startAt,
    uint256 proposalsCount,
    uint256 participation) {
    require(_sessionId < sessionsCount_, "VS03");
    Session storage session_ = sessions[_sessionId];
    return (
      session_.startAt,
      session_.proposalsCount,
      session_.participation);
  }

  /**
   * @dev lastVote
   */
  function lastVote(address _voter) public override view returns (uint64 at) {
    return lastVotes[_voter];
  }

  /**
   * @dev secretHash
   */
  function secretHash(address _voter) public override view returns (bytes32) {
    return secretHashes[_voter];
  }

  /**
   * @dev token
   */
  function token() public override view returns (ITokenProxy) {
    return token_;
  }

  /**
   * @dev proposalsCount
   */
  function proposalsCount() public override view returns (uint256) {
    return proposalsCount_;
  }

  /**
   * @dev proposal
   */
  function proposal(uint256 _proposalId) public override view returns (
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
  ) {
    require(_proposalId < proposalsCount_, "VS04");
    Proposal storage proposal_ = proposals[_proposalId];
    return (
      proposal_.sessionId,
      proposal_.name,
      proposal_.url,
      proposal_.proposalHash,
      proposal_.proposedBy,
      proposal_.resolutionTarget,
      proposal_.resolutionAction,
      proposal_.weight,
      proposal_.approvals,
      proposal_.resolutionExecuted,
      proposal_.cancelled);
  }

  /**
   * @dev isApproved
   */
  function isApproved(uint256 _proposalId) public override view returns (bool) {
    Proposal storage proposal_ = proposals[_proposalId];
    Session storage session_ = sessions[proposal_.sessionId];
    ResolutionRequirement storage requirement =
      resolutionRequirements[readSignatureInternal(proposal_.resolutionAction)];

    uint256 majority = requirement.majority;
    uint256 quorum = requirement.quorum;

    if (majority == 0 && quorum == 0) {
      majority = sessionRule_.defaultMajority;
      quorum = sessionRule_.defaultQuorum;
    }

    uint256 totalSupply = token_.totalSupply();

    return proposal_.approvals.mul(100).div(session_.participation) > majority
      && session_.participation.mul(100).div(totalSupply) > quorum;
  }

  /**
   * @dev isQuaestor
   */
  function isQuaestor(address _operator) public override view returns (bool) {
    return isProxyOperator(_operator, token_);
  }

  /**
   * @dev sessionStateAt
   */
  function sessionStateAt(uint256 _sessionId, uint256 _time) public override view returns (SessionState) {
    Session storage session_ = sessions[_sessionId];

    uint256 startAt = uint256(session_.startAt);
    if (startAt < sessionRule_.campaignPeriod) {
      return SessionState.CLOSED;
    }

    if (_time < startAt.sub(sessionRule_.campaignPeriod)) {
      return SessionState.PLANNED;
    }

    if (_time < startAt) {
      return SessionState.CAMPAIGN;
    }

    if (_time < startAt.add(sessionRule_.votingPeriod))
    {
      return SessionState.VOTING;
    }

    if (_time < startAt.add(
      sessionRule_.votingPeriod).add(sessionRule_.revealPeriod))
    {
      return SessionState.REVEAL;
    }

    if (_time < startAt.add(
      sessionRule_.votingPeriod).add(sessionRule_.revealPeriod).add(sessionRule_.gracePeriod))
    {
      return SessionState.GRACE;
    }

    return SessionState.CLOSED;
  }

  /**
   * @dev buildHash
   */
  function buildHash(bytes memory _data) public override view returns (bytes32) {
    return keccak256(_data);
  }

  /**
   * @dev updateSessionRule
   */
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
  )  public override onlyContract returns (bool) {
    require(_defaultMajority == 0 || _defaultQuorum == 0, "VS20");

    sessionRule_ = SessionRule(
      _gracePeriod,
      _campaignPeriod,
      _votingPeriod,
      _revealPeriod,
      _maxProposals,
      _maxProposalsQuaestor,
      _newProposalThreshold,
      _defaultMajority,
      _defaultQuorum);

    emit SessionRulesUpdated(
      _gracePeriod,
      _campaignPeriod,
      _votingPeriod,
      _revealPeriod,
      _maxProposals,
      _maxProposalsQuaestor,
      _newProposalThreshold,
      _defaultMajority,
      _defaultQuorum);
    return true;
  }

  /**
   * @dev updateResolutionRequirements
   */
  function updateResolutionRequirements(
    bytes4[] memory _methodSignatures,
    uint256[] memory _majorities,
    uint256[] memory _quorums
  ) public override onlyContract returns (bool)
  {
    require(_methodSignatures.length == _majorities.length, "VS05");
    require(_methodSignatures.length == _quorums.length, "VS06");

    for(uint256 i=0; i < _methodSignatures.length; i++) {
      resolutionRequirements[_methodSignatures[i]] =
        ResolutionRequirement(_majorities[i], _quorums[i]);
      emit ResolutionRequirementUpdated(
         _methodSignatures[i], _majorities[i], _quorums[i]);
    }
    return true;
  }

  /**
   * @dev defineProposal
   */
  function defineProposal(
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction) public override returns (bool)
  {
    uint256 balance = token_.balanceOf(msg.sender);
    require(balance >= sessionRule_.newProposalThreshold, "VS07");

    Session storage session_ = sessions[sessionsCount_-1];
    require(session_.proposalsCount < (isQuaestor(msg.sender) ?
      sessionRule_.maxProposalsQuaestor : sessionRule_.maxProposals
    ), "VS08");

    uint256 time = currentTime();
    SessionState state = sessionStateAt(sessionsCount_-1, time);
    if(state != SessionState.PLANNED) {
      require(state == SessionState.CLOSED, "VS09");
      uint256 sessionPeriod = uint256(sessionRule_.campaignPeriod)
        .add(sessionRule_.votingPeriod)
        .add(sessionRule_.revealPeriod)
        .add(sessionRule_.gracePeriod);

      uint256 nextStartAt = (time.sub(session_.startAt).div( sessionPeriod).add(1)).mul(sessionPeriod);

      session_ = sessions[sessionsCount_];
      session_.startAt = uint64(nextStartAt);

      require(core_.defineLock(
        address(token_),
        nextStartAt,
        nextStartAt.add(sessionRule_.votingPeriod).add(sessionRule_.revealPeriod),
        new address[](0)), "VS22");

      emit SessionScheduled(sessionsCount_, session_.startAt);
      sessionsCount_++;
    }

    uint256 proposalId = proposalsCount_++;
    Proposal storage proposal_ = proposals[proposalId];
    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposedBy = msg.sender;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;
    proposal_.weight = balance;
    
    session_.proposalsCount++;
    emit ProposalDefined(proposalId);
    return true;
  }

  /**
   * @dev updateProposal
   */
  function updateProposal(
    uint256 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction
  ) public override onlyProposalAuthor(_proposalId) returns (bool)
  {
    require(_proposalId < proposalsCount_, "VS04");
    Proposal storage proposal_ = proposals[_proposalId];
    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;

    emit ProposalUpdated(_proposalId);
    return true;
  }

  /**
   * @dev cancelProposal
   */
  function cancelProposal(uint256 _proposalId)
    public override onlyProposalAuthor(_proposalId) returns (bool)
  {
    require(_proposalId < proposalsCount_, "VS04");
    require(!proposals[_proposalId].cancelled, "VS10");

    proposals[_proposalId].cancelled = true;
    emit ProposalCancelled(_proposalId);
    return true;
  }

  /**
   * @dev vote
   */
  function submitVote(bool[] memory _votes) public override returns (bool)
  {
    require(sessionStateAt(sessionsCount_-1, currentTime()) == SessionState.VOTING, "VS13");
    return submitVoteInternal(_votes);
  }

  /**
   * @dev voteSecret
   */
  function submitVoteSecret(bytes32 _secretHash) public override returns (bool)
  {
    require(sessionStateAt(sessionsCount_-1, currentTime()) == SessionState.VOTING, "VS13");
    Session storage session_ = sessions[sessionsCount_-1];
    require(lastVotes[msg.sender] < session_.startAt, "VS11");

    secretHashes[msg.sender] = _secretHash;
    emit VoteSecret(sessionsCount_-1, msg.sender);
    return true;
  }

  /**
   * @dev reveal
   */
  function revealVoteSecret(bool[] memory _votes, bytes32 /*_salt*/) public override returns (bool)
  {
    require(sessionStateAt(sessionsCount_-1, currentTime()) == SessionState.REVEAL, "VS14");
    Session storage session_ = sessions[sessionsCount_-1];
    require(lastVotes[msg.sender] < session_.startAt, "VS11");
    require(buildHash(msg.data) == secretHashes[msg.sender], "VS18");

    emit VoteRevealed(sessionsCount_-1, msg.sender);
    return submitVoteInternal(_votes);
  }

  /**
   * @dev execute resolution
   */
  function executeResolution(uint256 _proposalId) public override returns (bool)
  {
    require(sessionStateAt(sessionsCount_-1, currentTime()) == SessionState.GRACE, "VS15");
    require(_proposalId < proposalsCount_, "VS04");
    Proposal storage proposal_ = proposals[_proposalId];

    require(!proposal_.cancelled, "VS10");
    require(!proposal_.resolutionExecuted, "VS16");
    require(isApproved(_proposalId), "VS19");

    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    (bool success, ) = proposal_.resolutionTarget.call(proposal_.resolutionAction);
    require(success, "VS17");

    proposal_.resolutionExecuted = true;
    emit ResolutionExecuted(_proposalId);
  }

  /**
   * @dev read signature
   * @param _data contains the selector
   */
  function readSignatureInternal(bytes memory _data) internal pure returns (bytes4 signature) {
    // solhint-disable-next-line no-inline-assembly
    assembly {
      signature := mload(add(_data, 0x20))
    }
  }

  /**
   * @dev submit vote internal
   */
  function submitVoteInternal(bool[] memory _votes) internal returns (bool)
  {
    Session storage session_ = sessions[sessionsCount_-1];
    require(lastVotes[msg.sender] < session_.startAt, "VS11");
    require(_votes.length == session_.proposalsCount, "VS12");

    uint256 weight = token_.balanceOf(msg.sender);
    for(uint256 i=0; i < session_.proposalsCount; i++) {
      if(_votes[i]) {
        uint256 proposalId = proposalsCount_ - session_.proposalsCount + i;
        Proposal storage proposal_ = proposals[proposalId];
        proposal_.approvals += weight;
      }
    }

    lastVotes[msg.sender] = uint64(currentTime());
    delete secretHashes[msg.sender];
    session_.participation += weight;

    emit Vote(sessionsCount_-1, msg.sender, weight);
    return true;
  }
}
