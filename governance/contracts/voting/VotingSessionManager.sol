pragma solidity ^0.6.0;

import "@c-layer/common/contracts/operable/OperableAsCore.sol";
import "../interface/IVotingSessionManager.sol";
import "./VotingSessionStorage.sol";


/**
 * @title VotingSessionManager
 * @dev VotingSessionManager contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VSM01: Session doesn't exist
 *   VSM02: Proposal doesn't exist
 *   VSM03: Token has no valid core
 *   VSM04: No current sessions available
 *   VSM05: Proposal was cancelled
 *   VSM06: Campaign period must be within valid range
 *   VSM07: Voting period must be within valid range
 *   VSM08: Grace period must be within valid range
 *   VSM09: Period offset must be within valid range
 *   VSM10: Public proposal limit must be within valid range
 *   VSM11: Operator proposal limit must be within valid range
 *   VSM12: New proposal threshold must be greater than 0
 *   VSM13: Execute resolution threshold must be greater than 0
 *   VSM14: Inconsistent numbers of methods signatures
 *   VSM15: Inconsistent numbers of min participations
 *   VSM16: Inconsistent numbers of quorums
 *   VSM17: No sessions must be ongoing
 *   VSM18: Default majority cannot be null
 *   VSM19: Operator proposal limit is reached
 *   VSM20: Not enough tokens for a new proposal
 *   VSM21: Too many proposals yet for this session
 *   VSM22: Current session is not in PLANNED state
 *   VSM23: Only the author can update a proposal
 *   VSM24: Not enough tokens to execute
 *   VSM25: Previous session is not in GRACE state
 *   VSM26: The current session is not in GRACE or CLOSED state
 *   VSM27: Unable to set the lock
 *   VSM28: Session is not in VOTING state
 *   VSM29: Voters must be provided
 *   VSM30: Sender must be either the voter, the voter's delegate or an operator
 *   VSM31: The voter must not have already voted for this session
 *   VSM32: The vote contains too many proposals
 *   VSM33: The resolution is already executed
 *   VSM34: The resolution has not been approved
 *   VSM35: The resolution must be successfull
 */
contract VotingSessionManager is VotingSessionStorage, IVotingSessionManager, OperableAsCore {

  modifier onlyExistingSession(uint256 _sessionId) {
    require(_sessionId > 0 && _sessionId <= sessionsCount_, "VSM01");
    _;
  }

  modifier onlyExistingProposal(uint256 _sessionId, uint256 _proposalId) {
    require(_sessionId > 0 && _sessionId <= sessionsCount_, "VSM01");
    require(_proposalId > 0 && _proposalId <= sessions[_sessionId].proposalsCount, "VSM02");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token) public {
    token_ = _token;
    core_ = ITokenCore(token_.core());
    require(address(core_) != address(0), "VSM03");

    resolutionRequirements[ANY_TARGET][ANY_METHOD] =
      ResolutionRequirement(DEFAULT_MAJORITY, DEFAULT_QUORUM);
  }

  /**
   * @dev sessionRule
   */
  function sessionRule() override public view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold,
    uint256 executeResolutionThreshold) {
    return (
      sessionRule_.campaignPeriod,
      sessionRule_.votingPeriod,
      sessionRule_.gracePeriod,
      sessionRule_.periodOffset,
      sessionRule_.maxProposals,
      sessionRule_.maxProposalsOperator,
      sessionRule_.newProposalThreshold,
      sessionRule_.executeResolutionThreshold);
  }

  /**
   * @dev resolutionRequirement
   */
  function resolutionRequirement(address _target, bytes4 _method) override public view returns (
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
  function sessionsCount() override public view returns (uint256) {
    return sessionsCount_;
  }

  /**
   * @dev currentSessionId
   */
  function currentSessionId() override public view returns (uint256) {
    uint256 sessionId = sessionsCount_;
    require(sessionStateAt(sessionId, currentTime()) != SessionState.CLOSED, "VSM04");
    return sessionId;
  }

  /**
   * @dev session
   */
  function session(uint256 _sessionId) override public
    onlyExistingSession(_sessionId) view returns (
    uint64 campaignAt,
    uint64 voteAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 proposalsCount,
    uint256 participation)
  {
    Session storage session_ = sessions[_sessionId];
    return (
      session_.campaignAt,
      session_.voteAt,
      session_.graceAt,
      session_.closedAt,
      session_.proposalsCount,
      session_.participation);
  }

  /**
   * @dev delegate
   */
  function delegate(address _voter) override public view returns (address) {
    return delegates[_voter];
  }

  /**
   * @dev lastVote
   */
  function lastVote(address _voter) override public view returns (uint64 at) {
    return lastVotes[_voter];
  }

  /**
   * @dev token
   */
  function token() override public view returns (ITokenProxy) {
    return token_;
  }

  /**
   * @dev proposal
   */
  function proposal(uint256 _sessionId, uint256 _proposalId) override public
    onlyExistingProposal(_sessionId, _proposalId) view returns (
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
  function proposalData(uint256 _sessionId, uint256 _proposalId) override public
    onlyExistingProposal(_sessionId, _proposalId) view returns (
    address proposedBy,
    uint256 weight,
    uint256 approvals,
    bool resolutionExecuted,
    bool cancelled)
  {
    Proposal storage proposal_ = sessions[_sessionId].proposals[_proposalId];
    return (
      proposal_.proposedBy,
      proposal_.weight,
      proposal_.approvals,
      proposal_.resolutionExecuted,
      proposal_.cancelled);
  }

  /**
   * @dev isApproved
   */
  function isApproved(uint256 _sessionId, uint256 _proposalId) override public
    onlyExistingProposal(_sessionId, _proposalId) view returns (bool)
  {
    Session storage session_ = sessions[_sessionId];
    Proposal storage proposal_ = session_.proposals[_proposalId];
    
    require(!proposal_.cancelled, "VSM05");

    bytes4 actionSignature = readSignatureInternal(proposal_.resolutionAction);
    ResolutionRequirement storage requirement =
      resolutionRequirements[proposal_.resolutionTarget][actionSignature];

    uint256 majority = requirement.majority;
    uint256 quorum = requirement.quorum;

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[proposal_.resolutionTarget][bytes4(ANY_METHOD)];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[ANY_TARGET][actionSignature];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    if (majority == 0 && quorum == 0) {
      requirement = resolutionRequirements[ANY_TARGET][bytes4(ANY_METHOD)];
      majority = requirement.majority;
      quorum = requirement.quorum;
    }

    uint256 totalSupply = token_.totalSupply();

    return (session_.participation != 0 && totalSupply != 0)
      && proposal_.approvals.mul(100).div(session_.participation) > majority
      && session_.participation.mul(100).div(totalSupply) > quorum;
  }

  /**
   * @dev nextSessionAt
   */
  function nextSessionAt(uint256 _time) override public view returns (uint256 at) {
    uint256 sessionPeriod =
      sessionRule_.campaignPeriod + sessionRule_.votingPeriod + sessionRule_.gracePeriod;

    uint256 currentSessionClosedAt;
    if (sessionsCount_ > 0) {
      currentSessionClosedAt = uint256(sessions[sessionsCount_].closedAt);
    }

    at = (_time > currentSessionClosedAt) ? _time : currentSessionClosedAt;
    at =
      ((at + sessionRule_.campaignPeriod) / sessionPeriod + 1) * sessionPeriod + sessionRule_.periodOffset;
  }

  /**
   * @dev sessionStateAt
   */
  function sessionStateAt(uint256 _sessionId, uint256 _time) override public
    onlyExistingSession(_sessionId) view returns (SessionState)
  {
    Session storage session_ = sessions[_sessionId];

    if (_time < uint256(session_.campaignAt)) {
      return SessionState.PLANNED;
    }

    if (_time < uint256(session_.voteAt)) {
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
    uint64 _periodOffset,
    uint8 _maxProposals,
    uint8 _maxProposalsOperator,
    uint256 _newProposalThreshold,
    uint256 _executeResolutionThreshold
  )  override public onlyProxyOperator(token_) returns (bool) {
    require(_campaignPeriod >= MIN_PERIOD_LENGTH && _campaignPeriod <= MAX_PERIOD_LENGTH, "VSM06");
    require(_votingPeriod >= MIN_PERIOD_LENGTH && _votingPeriod <= MAX_PERIOD_LENGTH, "VSM07");
    require(_gracePeriod >= MIN_PERIOD_LENGTH && _gracePeriod <= MAX_PERIOD_LENGTH, "VSM08");
    require(_periodOffset <= MAX_PERIOD_LENGTH, "VSM09");

    require(_maxProposals !=0 && _maxProposals <= MAX_PROPOSALS_HARD_LIMIT, "VSM10");
    require(_maxProposalsOperator !=0 &&
      _maxProposalsOperator <= MAX_PROPOSALS_HARD_LIMIT, "VSM11");

    require(_newProposalThreshold != 0, "VSM12");
    require(_executeResolutionThreshold != 0, "VSM13");

    sessionRule_ = SessionRule(
      _campaignPeriod,
      _votingPeriod,
      _gracePeriod,
      _periodOffset,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold,
      _executeResolutionThreshold);

    emit SessionRuleUpdated(
      _campaignPeriod,
      _votingPeriod,
      _gracePeriod,
      _periodOffset,
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
  ) override public onlyProxyOperator(token_) returns (bool)
  {
    require(_targets.length == _methodSignatures.length, "VSM14");
    require(_methodSignatures.length == _majorities.length, "VSM15");
    require(_methodSignatures.length == _quorums.length, "VSM16");

    if (sessionsCount_ != 0) {
      SessionState state = sessionStateAt(sessionsCount_, currentTime());
      require(
        state != SessionState.CAMPAIGN &&
        state != SessionState.VOTING, "VSM17");
    }

    for(uint256 i=0; i < _methodSignatures.length; i++) {
      // Majority can only be 0, if quorum is 0 and it is not the global default
      require(_majorities[i] != 0 ||
        (_quorums[i] == 0 && !(_targets[i] == ANY_TARGET && _methodSignatures[i] == ANY_METHOD)), "VSM18");

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
  function defineDelegate(address _delegate) override public returns (bool) {
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
    bytes memory _resolutionAction) override public returns (bool)
  {
    Session storage session_ = loadSessionInternal();
    uint256 balance = token_.balanceOf(msg.sender);

    if (isProxyOperator(msg.sender, token_)) {
      require(session_.proposalsCount < sessionRule_.maxProposalsOperator, "VSM19");
    } else {
      require(balance >= sessionRule_.newProposalThreshold, "VSM20");
      require(session_.proposalsCount < sessionRule_.maxProposals, "VSM21");
    }

    uint256 proposalId = ++session_.proposalsCount;
    Proposal storage proposal_ = session_.proposals[proposalId];
    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposedBy = msg.sender;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;
    proposal_.weight = balance;
    
    emit ProposalDefined(sessionsCount_, proposalId);
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
  ) override public onlyExistingProposal(sessionsCount_, _proposalId) returns (bool)
  {
    uint256 sessionId = sessionsCount_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VSM22");

    Session storage session_ = sessions[sessionId];
    Proposal storage proposal_ = session_.proposals[_proposalId];
    require(msg.sender == proposal_.proposedBy, "VSM23");

    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;
    proposal_.weight = token_.balanceOf(msg.sender);

    emit ProposalUpdated(sessionId, _proposalId);
    return true;
  }

  /**
   * @dev cancelProposal
   */
  function cancelProposal(uint256 _proposalId)
    override public onlyExistingProposal(sessionsCount_, _proposalId) returns (bool)
  {
    uint256 sessionId = sessionsCount_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VSM22");
    Proposal storage proposal_ = sessions[sessionId].proposals[_proposalId];
    
    require(!proposal_.cancelled, "VSM05");
    require(msg.sender == proposal_.proposedBy, "VSM23");

    proposal_.cancelled = true;
    emit ProposalCancelled(sessionId, _proposalId);
    return true;
  }

  /**
   * @dev submitVote
   */
  function submitVote(uint256 _votes) override public returns (bool)
  {
    address[] memory voters = new address[](1);
    voters[0] = msg.sender;
    return submitVoteInternal(voters, _votes);
  }

  /**
   * @dev submitVoteOnBehalf
   */
  function submitVoteOnBehalf(
    address[] memory _voters,
    uint256 _votes
  ) override public returns (bool)
  {
    return submitVoteInternal(_voters, _votes);
  }

  /**
   * @dev execute resolutions
   */
  function executeResolutions(uint256[] memory _proposalIds) override public returns (bool)
  {
    if (!isProxyOperator(msg.sender, token_)) {
      uint256 balance = token_.balanceOf(msg.sender);
      require(balance >= sessionRule_.executeResolutionThreshold, "VSM24");
    }

    uint256 time = currentTime();
    uint256 sessionId_ = sessionsCount_;
    SessionState currentSessionState = sessionStateAt(sessionId_, time);
    if(currentSessionState != SessionState.GRACE) {
      require(currentSessionState == SessionState.PLANNED, "VSM22");
      // The next session has not started yet, previous session proposals can still be executed
      sessionId_--;
      require(sessionStateAt(sessionId_, time) == SessionState.GRACE, "VSM25");
    }

    for (uint256 i=0; i < _proposalIds.length; i++) {
      executeResolutionInternal(sessionId_, _proposalIds[i]);
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
      require(state == SessionState.GRACE || state == SessionState.CLOSED, "VSM26");
      uint256 nextStartAt = nextSessionAt(time);
      session_ = sessions[++sessionsCount_];
      session_.campaignAt = uint64(nextStartAt.sub(sessionRule_.campaignPeriod));
      session_.voteAt = uint64(nextStartAt);
      session_.graceAt = uint64(nextStartAt.add(sessionRule_.votingPeriod));
      session_.closedAt = uint64(nextStartAt.add(sessionRule_.votingPeriod).add(sessionRule_.gracePeriod));

      require(core_.defineLock(
        address(this),
        nextStartAt,
        session_.graceAt,
        new address[](0)), "VSM27");

      emit SessionScheduled(sessionsCount_, session_.voteAt);
    } else {
      session_ = sessions[sessionsCount_];
    }
  }

  /**
   * @dev submit vote for proposals internal
   */
  function submitVoteInternal(
    address[] memory _voters,
    uint256 _votes) internal returns (bool)
  {
    require(sessionStateAt(sessionsCount_, currentTime()) == SessionState.VOTING, "VSM28");
    Session storage session_ = sessions[sessionsCount_];
    require(_voters.length > 0, "VSM29");

    uint256 weight = 0;
    uint64 time = uint64(currentTime());
    bool isOperator = isProxyOperator(msg.sender, token_);

    for(uint256 i=0; i < _voters.length; i++) {
      address voter = _voters[i];

      require(voter == msg.sender ||
        (isOperator && !core_.isSelfManaged(voter)) ||
        delegates[voter] == msg.sender, "VSM30");
      require(lastVotes[voter] < session_.voteAt, "VSM31");
      uint256 balance = token_.balanceOf(voter);
      weight += balance;
      lastVotes[voter] = time;
      emit Vote(sessionsCount_, voter, balance);
    }

    uint256 remainingVotes = _votes;
    for(uint256 i=1; i <= session_.proposalsCount && remainingVotes != 0; i++) {
      Proposal storage proposal_ = session_.proposals[i];

      if (!proposal_.cancelled && (remainingVotes & 1) == 1) {
        proposal_.approvals += weight;
      }
      remainingVotes = remainingVotes >> 1;
    }
    require(remainingVotes == 0, "VSM32");

    session_.participation += weight;
    return true;
  }

  /**
   * @dev execute resolution internal
   */
  function executeResolutionInternal(uint256 _sessionId, uint256 _proposalId) internal
    onlyExistingProposal(_sessionId, _proposalId) returns (bool)
  {
    Proposal storage proposal_ = sessions[_sessionId].proposals[_proposalId];

    require(!proposal_.resolutionExecuted, "VSM33");
    require(isApproved(_sessionId, _proposalId), "VSM34");

    proposal_.resolutionExecuted = true;

    if (proposal_.resolutionTarget != ANY_TARGET) {
      // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
      (bool success, ) = proposal_.resolutionTarget.call(proposal_.resolutionAction);
      require(success, "VSM35");
    }

    emit ResolutionExecuted(_sessionId, _proposalId);
    return true;
  }
}
