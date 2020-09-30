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
 *   VS01: Proposal doesn't exist
 *   VS02: Not the proposal author
 *   VS03: Token must have a valid core
 *   VS04: No sessions exist
 *   VS05: Session doesn't exist
 *   VS06: The proposal is cancelled
 *   VS07: Campaign period must be within valid range
 *   VS08: Voting period must be within valid range
 *   VS09: Grace period must be within valid range
 *   VS10: At least one proposal should be allowed
 *   VS11: New proposal threshold must be greater than 0
 *   VS12: Execute resolution threshold must be greater than 0
 *   VS13: Inconsistent numbers of methods signatures
 *   VS14: Inconsistent numbers of min participations
 *   VS15: Inconsistent numbers of quorums
 *   VS16: No sessions must be ongoing
 *   VS17: Default majority cannot be null
 *   VS18: Operator proposal limit is reached
 *   VS19: Not enought tokens for a new proposal
 *   VS20: Too many proposals yet for this session
 *   VS21: Session is not in PLANNED state
 *   VS22: Not enougth tokens to execute
 *   VS23: Session must be in PLANNED state
 *   VS24: Previous session is not in GRACE state
 *   VS25: Proposal must be from the most recently validated session.
 *   VS26: The resolution is already executed
 *   VS27: The resolution has not been approved
 *   VS28: The resolution must be successfull
 *   VS29: The session must be in GRACE or CLOSED state
 *   VS30: Token must be successfully locked
 *   VS31: Session must be in VOTING state
 *   VS32: The voter must not have already voted for this session
 *   VS33: Too many votes number
 *   VS34: Proposals must match votes
 *   VS35: Voters must be provided
 *   VS36: Sender must be either the voter, the voter's delegate,
 *         or an operator if the voter is not self managed
 */
contract VotingSession is VotingStorage, IVotingSession, OperableAsCore {

  modifier onlyProposalAuthor(uint256 _proposalId) {
    require(_proposalId < proposalsCount_, "VS01");
    require(msg.sender == proposals[_proposalId].proposedBy, "VS02");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token) public {
    token_ = _token;
    core_ = ITokenCore(token_.core());
    require(address(core_) != address(0), "VS03");
    resolutionRequirements[UNDEFINED_TARGET][ANY_METHODS] =
      ResolutionRequirement(DEFAULT_MAJORITY, DEFAULT_QUORUM);
  }

  /**
   * @dev sessionRule
   */
  function sessionRule() public override view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeResolutionThreshold) {
    return (
      sessionRule_.campaignPeriod,
      sessionRule_.votingPeriod,
      sessionRule_.gracePeriod,
      sessionRule_.maxProposals,
      sessionRule_.maxProposalsOperator,
      sessionRule_.newProposalThreshold,
      sessionRule_.executeResolutionThreshold);
  }

  /**
   * @dev resolutionRequirement
   */
  function resolutionRequirement(address _target, bytes4 _method) public override view returns (
    uint256 majority,
    uint256 quorum) {
    ResolutionRequirement storage requirement =
      resolutionRequirements[_target][_method];

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
   * @dev currentSessionId
   */
  function currentSessionId() public override view returns (uint256) {
    require(sessionsCount_ > 0, "VS04");
    return sessionsCount_;
  }

  /**
   * @dev session
   */
  function session(uint256 _sessionId) public override view returns (
    uint64 campaignAt,
    uint64 startAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 proposalsCount,
    uint256 participation) {
    require(_sessionId > 0 && _sessionId <= sessionsCount_, "VS05");
    Session storage session_ = sessions[_sessionId];
    return (
      session_.campaignAt,
      session_.startAt,
      session_.graceAt,
      session_.closedAt,
      session_.proposalsCount,
      session_.participation);
  }

  /**
   * @dev delegate
   */
  function delegate(address _voter) public override view returns (address) {
    return delegates[_voter];
  }

  /**
   * @dev lastVote
   */
  function lastVote(address _voter) public override view returns (uint64 at) {
    return lastVotes[_voter];
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
    require(_proposalId < proposalsCount_, "VS01");
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
    require(_proposalId < proposalsCount_, "VS01");

    Proposal storage proposal_ = proposals[_proposalId];
    require(!proposal_.cancelled, "VS06");

    Session storage session_ = sessions[proposal_.sessionId];
    bytes4 actionSignature = readSignatureInternal(proposal_.resolutionAction);
    ResolutionRequirement storage requirement =
      resolutionRequirements[proposal_.resolutionTarget][actionSignature];

    uint256 majority = requirement.majority;
    uint256 quorum = requirement.quorum;

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[proposal_.resolutionTarget][bytes4(ANY_METHODS)];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[UNDEFINED_TARGET][actionSignature];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[UNDEFINED_TARGET][bytes4(ANY_METHODS)];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    uint256 totalSupply = token_.totalSupply();

    return (session_.participation != 0 && totalSupply != 0)
      && proposal_.approvals.mul(100).div(session_.participation) > majority
      && session_.participation.mul(100).div(totalSupply) > quorum;
  }

  /**
   * @dev sessionStateAt
   */
  function sessionStateAt(uint256 _sessionId, uint256 _time) public override view returns (SessionState) {
    require(_sessionId > 0 && _sessionId <= sessionsCount_, "VS05");
    Session storage session_ = sessions[_sessionId];

    if (_time < uint256(session_.campaignAt)) {
      return SessionState.PLANNED;
    }

    if (_time < uint256(session_.startAt)) {
      return SessionState.CAMPAIGN;
    }

    if (_time < uint256(session_.graceAt))
    {
      return SessionState.VOTING;
    }

    if (_time < uint256(session_.closedAt))
    {
      return SessionState.GRACE;
    }

    return SessionState.CLOSED;
  }

  /**
   * @dev updateSessionRule
   */
  function updateSessionRule(
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _gracePeriod,
    uint8 _maxProposals,
    uint8 _maxProposalsOperator,
    uint256 _newProposalThreshold,
    uint256 _executeResolutionThreshold
  )  public override onlyProxyOperator(token_) returns (bool) {
    require(_campaignPeriod != 0 && _campaignPeriod <= MAX_PERIOD_LENGTH, "VS07");
    require(_votingPeriod != 0 && _votingPeriod <= MAX_PERIOD_LENGTH, "VS08");
    require(_gracePeriod != 0 && _gracePeriod <= MAX_PERIOD_LENGTH, "VS09");

    require(_maxProposals != 0 || _maxProposalsOperator != 0, "VS10");
    require(_newProposalThreshold != 0, "VS11");
    require(_executeResolutionThreshold != 0, "VS12");

    sessionRule_ = SessionRule(
      _campaignPeriod,
      _votingPeriod,
      _gracePeriod,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold,
      _executeResolutionThreshold);

    emit SessionRuleUpdated(
      _campaignPeriod,
      _votingPeriod,
      _gracePeriod,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold,
      _executeResolutionThreshold);
    return true;
  }

  /**
   * @dev updateResolutionRequirements
   */
  function updateResolutionRequirements(
    address[] memory _targets,
    bytes4[] memory _methodSignatures,
    uint256[] memory _majorities,
    uint256[] memory _quorums
  ) public override onlyProxyOperator(token_) returns (bool)
  {
    require(_targets.length == _methodSignatures.length, "VS13");
    require(_methodSignatures.length == _majorities.length, "VS14");
    require(_methodSignatures.length == _quorums.length, "VS15");

    if (sessionsCount_ != 0) {
      SessionState state = sessionStateAt(sessionsCount_, currentTime());
      require(
        state != SessionState.CAMPAIGN &&
        state != SessionState.VOTING, "VS16");
    }

    for(uint256 i=0; i < _methodSignatures.length; i++) {
      require(_majorities[i] != 0, "VS17");

      resolutionRequirements[_targets[i]][_methodSignatures[i]] =
        ResolutionRequirement(_majorities[i], _quorums[i]);
      emit ResolutionRequirementUpdated(
         _targets[i], _methodSignatures[i], _majorities[i], _quorums[i]);
    }
    return true;
  }

  /**
   * @dev defineDelegate
   */
  function defineDelegate(address _delegate) public override returns (bool) {
    delegates[msg.sender] = _delegate;
    emit DelegateDefined(msg.sender, _delegate);
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
    Session storage session_ = loadSessionInternal();
    uint256 balance = token_.balanceOf(msg.sender);

    if (isProxyOperator(msg.sender, token_)) {
      require(session_.proposalsCount < sessionRule_.maxProposalsOperator, "VS18");
    } else {
      require(balance >= sessionRule_.newProposalThreshold, "VS19");
      require(session_.proposalsCount < sessionRule_.maxProposals, "VS20");
    }

    uint256 proposalId = proposalsCount_++;
    Proposal storage proposal_ = proposals[proposalId];
    proposal_.sessionId = sessionsCount_;
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
    require(sessionStateAt(sessionsCount_, currentTime()) == SessionState.PLANNED, "VS21");

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
    require(sessionStateAt(sessionsCount_, currentTime()) == SessionState.PLANNED, "VS21");
    require(!proposals[_proposalId].cancelled, "VS06");

    proposals[_proposalId].cancelled = true;
    emit ProposalCancelled(_proposalId);
    return true;
  }

  /**
   * @dev submitVote
   */
  function submitVote(bool[] memory _vote) public override returns (bool)
  {
    return submitVoteInternal(_vote);
  }

  /**
   * @dev submitVoteForPropposals
   */
  function submitVoteForProposals(
    uint256[] memory _proposalIds,
    bool[] memory _vote
  ) public override returns (bool)
  {
    address[] memory voters = new address[](1);
    voters[0] = msg.sender;
    return submitVoteForProposalsInternal(_proposalIds, _vote, voters);
  }

  /**
   * @dev submitVoteOnBehalf
   */
  function submitVoteOnBehalf(
    uint256[] memory _proposalIds,
    bool[] memory _vote,
    address[] memory _voters
  ) public override returns (bool)
  {
    if (isProxyOperator(msg.sender, token_)) {
      return submitVoteForProposalsInternal(_proposalIds, _vote, _voters);
    }
  }

  /**
   * @dev execute resolution
   */
  function executeResolution(uint256 _proposalId) public override returns (bool)
  {
    uint256 sessionId_ = sessionsCount_;

    if (!isProxyOperator(msg.sender, token_)) {
      uint256 balance = token_.balanceOf(msg.sender);
      require(balance >= sessionRule_.executeResolutionThreshold, "VS22");
    }

    SessionState currentSessionState = sessionStateAt(sessionId_, currentTime());
    if(currentSessionState != SessionState.GRACE) {
      require(currentSessionState == SessionState.PLANNED, "VS23");
      // The next session has not started yet, previous session proposals can still be executed
      sessionId_--;
      require(sessionStateAt(sessionId_, currentTime()) == SessionState.GRACE, "VS24");
    }

    require(_proposalId < proposalsCount_, "VS01");
    Proposal storage proposal_ = proposals[_proposalId];

    require(proposal_.sessionId == sessionId_, "VS25");
    require(!proposal_.resolutionExecuted, "VS26");
    require(isApproved(_proposalId), "VS27");

    proposal_.resolutionExecuted = true;

    if (proposal_.resolutionTarget != UNDEFINED_TARGET) {
      // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
      (bool success, ) = proposal_.resolutionTarget.call(proposal_.resolutionAction);
      require(success, "VS28");
    }

    emit ResolutionExecuted(_proposalId);
    return true;
  }

  /**
   * @dev execute many resolution
   */
  function executeManyResolutions(uint256[] memory _proposalIds) public override returns (bool)
  {
    for (uint256 i=0; i < _proposalIds.length; i++) {
      executeResolution(_proposalIds[i]);
    }
    return true;
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
   * @dev load session internal
   */
  function loadSessionInternal() internal returns (Session storage session_) {
    uint256 time = currentTime();

    SessionState state = SessionState.CLOSED;
    if (sessionsCount_ != 0) {
      state = sessionStateAt(sessionsCount_, time);
    }

    if(state != SessionState.PLANNED) {
      // Creation of a new session
      require(state == SessionState.GRACE || state == SessionState.CLOSED, "VS29");
      uint256 sessionPeriod = uint256(sessionRule_.campaignPeriod)
        .add(sessionRule_.votingPeriod)
        .add(sessionRule_.gracePeriod);

      uint256 previousStartAt =
        (sessionsCount_ != 0) ? sessions[sessionsCount_].startAt : 0;
      uint nextAvailableSession;
      if (state == SessionState.GRACE) {
        nextAvailableSession =
          ((time.sub(previousStartAt)).div(sessionPeriod)).add(1);
      } else {
        nextAvailableSession =
          (((time.sub(previousStartAt)).add(sessionRule_.campaignPeriod)).div(sessionPeriod)).add(1);
      }

      uint256 nextStartAt = nextAvailableSession.mul(sessionPeriod).add(previousStartAt);

      session_ = sessions[++sessionsCount_];
      session_.campaignAt = uint64(nextStartAt.sub(sessionRule_.campaignPeriod));
      session_.startAt = uint64(nextStartAt);
      session_.graceAt = uint64(nextStartAt.add(sessionRule_.votingPeriod));
      session_.closedAt = uint64(nextStartAt.add(sessionRule_.votingPeriod).add(sessionRule_.gracePeriod));

      require(core_.defineLock(
        address(token_),
        nextStartAt,
        session_.graceAt,
        new address[](0)), "VS30");

      emit SessionScheduled(sessionsCount_, session_.startAt);
    } else {
      session_ = sessions[sessionsCount_];
    }
  }

  /**
   * @dev submit vote internal
   */
  function submitVoteInternal(bool[] memory _votes) internal returns (bool)
  {
    require(sessionStateAt(sessionsCount_, currentTime()) == SessionState.VOTING, "VS31");
    Session storage session_ = sessions[sessionsCount_];
    require(lastVotes[msg.sender] < session_.startAt, "VS32");
    require(_votes.length <= session_.proposalsCount, "VS33");

    uint256 weight = token_.balanceOf(msg.sender);
    for(uint256 i=0; i < _votes.length; i++) {
      if(_votes[i]) {
        uint256 proposalId = proposalsCount_ - session_.proposalsCount + i;
        Proposal storage proposal_ = proposals[proposalId];
        proposal_.approvals += (proposal_.cancelled) ? 0: weight;
      }
    }

    lastVotes[msg.sender] = uint64(currentTime());
    session_.participation += weight;

    emit Vote(sessionsCount_, msg.sender, weight);
    return true;
  }

  /**
   * @dev submit vote for proposals internal
   */
  function submitVoteForProposalsInternal(
    uint256[] memory _proposalIds,
    bool[] memory _votes,
    address[] memory _voters) internal returns (bool)
  {
    require(sessionStateAt(sessionsCount_, currentTime()) == SessionState.VOTING, "VS31");
    Session storage session_ = sessions[sessionsCount_];
    require(_votes.length == _proposalIds.length, "VS34");
    require(_voters.length > 0, "VS35");

    uint256 weight = 0;
    uint64 time = uint64(currentTime());
    bool isOperator = isProxyOperator(msg.sender, token_);

    for(uint256 i=0; i < _voters.length; i++) {
      address voter = _voters[i];

      require(voter == msg.sender ||
        (isOperator && !core_.isSelfManaged(voter)) ||
        delegates[voter] == msg.sender, "VS36");
      require(lastVotes[voter] < session_.startAt, "VS32");
      uint256 balance = token_.balanceOf(voter);
      weight += balance;
      lastVotes[voter] = time;
      emit Vote(sessionsCount_, voter, balance);
    }

    for(uint256 i=0; i < _proposalIds.length; i++) {
      if(_votes[i]) {
        uint256 proposalId = _proposalIds[i];
        Proposal storage proposal_ = proposals[proposalId];
        proposal_.approvals += (proposal_.cancelled) ? 0: weight;
      }
    }

    session_.participation += weight;
    return true;
  }
}
