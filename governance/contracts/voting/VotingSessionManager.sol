pragma solidity ^0.6.0;

import "@c-layer/common/contracts/core/Proxy.sol";
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
 *   VSM04: Proposal was cancelled
 *   VSM05: Campaign period must be within valid range
 *   VSM06: Voting period must be within valid range
 *   VSM07: Execution period must be within valid range
 *   VSM08: Grace period must be within valid range
 *   VSM09: Period offset must be within valid range
 *   VSM10: Open proposals limit must be lower than the max proposals limit
 *   VSM11: Operator proposal limit must be greater than 0
 *   VSM12: New proposal threshold must be greater than 0
 *   VSM13: The current session is not in GRACE or CLOSED state
 *   VSM14: Inconsistent numbers of methods signatures
 *   VSM15: Inconsistent numbers of min participations
 *   VSM16: Inconsistent numbers of quorums
 *   VSM17: Inconsistent numbers of execution thresholds
 *   VSM18: Default majority cannot be null
 *   VSM19: Execute resolution threshold must be greater than 0
 *   VSM20: Operator proposal limit is reached
 *   VSM21: Too many proposals yet for this session
 *   VSM22: Not enough tokens for a new proposal
 *   VSM23: Current session is not in PLANNED state
 *   VSM24: Only the author can update a proposal
 *   VSM25: Proposal must not be already cancelled
 *   VSM26: The previous session can only be in GRACE state to allow rules change
 *   VSM27: Not enough tokens to execute
 *   VSM28: Voting Session resolutions are not allowed in EXECUTION
 *   VSM29: Only Voting Session operations are allowed in GRACE
 *   VSM30: The proposal is not in APPROVED state
 *   VSM31: The resolution must be successfull
 *   VSM32: The current session is not in GRACE or CLOSED state
 *   VSM33: Unable to set the lock
 *   VSM34: Session is not in VOTING state
 *   VSM35: Voters must be provided
 *   VSM36: Sender must be either the voter, the voter's sponsor or an operator
 *   VSM37: The voter must not have already voted for this session
 *   VSM38: Cannot submit multiple votes for a proposal and its alternatives
 *   VSM39: The vote contains too many proposals
 */
contract VotingSessionManager is VotingSessionStorage, IVotingSessionManager, OperableAsCore, Proxy {

  modifier onlyExistingSession(uint256 _sessionId) {
    require(_sessionId > 0 && _sessionId <= currentSessionId_, "VSM01");
    _;
  }

  modifier onlyExistingProposal(uint256 _sessionId, uint256 _proposalId) {
    require(_sessionId > 0 && _sessionId <= currentSessionId_, "VSM01");
    require(_proposalId > 0 && _proposalId <= sessions[_sessionId].proposalsCount, "VSM02");
    _;
  }

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token) public Proxy(_token.core()) {
    token_ = _token;
    require(address(core) != address(0), "VSM03");

    resolutionRequirements[ANY_TARGET][ANY_METHOD] =
      ResolutionRequirement(DEFAULT_MAJORITY, DEFAULT_QUORUM, DEFAULT_EXECUTION_THRESHOLD);
  }

  /**
   * @dev sessionRule
   */
  function sessionRule() override public view returns (
    uint64 campaignPeriod,
    uint64 votingPeriod,
    uint64 executionPeriod,
    uint64 gracePeriod,
    uint64 periodOffset,
    uint8 openProposals,
    uint8 maxProposals,
    uint8 maxProposalsOperator,
    uint256 newProposalThreshold) {
    return (
      sessionRule_.campaignPeriod,
      sessionRule_.votingPeriod,
      sessionRule_.executionPeriod,
      sessionRule_.gracePeriod,
      sessionRule_.periodOffset,
      sessionRule_.openProposals,
      sessionRule_.maxProposals,
      sessionRule_.maxProposalsOperator,
      sessionRule_.newProposalThreshold);
  }

  /**
   * @dev newProposalThresholdAt
   */
  function newProposalThresholdAt(uint256 _sessionId, uint256 _proposalsCount) override public
    onlyExistingSession(_sessionId) view returns (uint256)
  {
    Session storage session_ = sessions[_sessionId];
    bool baseThreshold = (
      sessionRule_.maxProposals <= sessionRule_.openProposals
      || _proposalsCount <= sessionRule_.openProposals
      || session_.totalSupply <= sessionRule_.newProposalThreshold);

    return (baseThreshold) ? sessionRule_.newProposalThreshold : sessionRule_.newProposalThreshold.add(
      (session_.totalSupply.div(2)).sub(sessionRule_.newProposalThreshold).mul(
        (_proposalsCount - sessionRule_.openProposals) ** 2).div((sessionRule_.maxProposals - sessionRule_.openProposals) ** 2));
  }

  /**
   * @dev resolutionRequirement
   */
  function resolutionRequirement(address _target, bytes4 _method) override public view returns (
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
   * @dev sessionsCount
   */
  function sessionsCount() override public view returns (uint256) {
    return currentSessionId_;
  }

  /**
   * @dev session
   */
  function session(uint256 _sessionId) override public
    onlyExistingSession(_sessionId) view returns (
    uint64 campaignAt,
    uint64 voteAt,
    uint64 executionAt,
    uint64 graceAt,
    uint64 closedAt,
    uint256 proposalsCount,
    uint256 participation,
    uint256 totalSupply)
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
      session_.totalSupply);
  }

  /**
   * @dev sponsorOf
   */
  function sponsorOf(address _voter) override public view returns (address address_, uint64 until) {
    Sponsor storage sponsor_ = sponsors[_voter];
    address_ = sponsor_.address_;
    until = sponsor_.until;
  }

  /**
   * @dev lastVoteOf
   */
  function lastVoteOf(address _voter) override public view returns (uint64 at) {
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
    uint128 requirementMajority,
    uint128 requirementQuorum,
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
      proposal_.dependsOn,
      proposal_.alternativeOf,
      proposal_.alternativesMask,
      proposal_.approvals);
  }

  /**
   * @dev nextSessionAt
   */
  function nextSessionAt(uint256 _time) override public view returns (uint256 at) {
    uint256 sessionPeriod =
      sessionRule_.campaignPeriod
      + sessionRule_.votingPeriod
      + sessionRule_.executionPeriod
      + sessionRule_.gracePeriod;

    uint256 currentSessionClosedAt;
    if (currentSessionId_ > 0) {
      currentSessionClosedAt = uint256(sessions[currentSessionId_].closedAt);
    }

    at = (_time > currentSessionClosedAt) ? _time : currentSessionClosedAt;
    at =
      ((at + sessionRule_.campaignPeriod) / sessionPeriod + 1) * sessionPeriod + sessionRule_.periodOffset;
  }

  /**
   * @dev sessionStateAt
   */
  function sessionStateAt(uint256 _sessionId, uint256 _time) override public
    view returns (SessionState)
  {
    if (_sessionId == 0 || _sessionId > currentSessionId_) {
      return SessionState.UNDEFINED;
    }

    Session storage session_ = sessions[_sessionId];

    if (_time < uint256(session_.campaignAt)) {
      return SessionState.PLANNED;
    }

    if (_time < uint256(session_.voteAt)) {
      return SessionState.CAMPAIGN;
    }

    if (_time < uint256(session_.executionAt))
    {
      return SessionState.VOTING;
    }

    if (_time < uint256(session_.graceAt))
    {
      return SessionState.EXECUTION;
    }

    if (_time < uint256(session_.closedAt))
    {
      return SessionState.GRACE;
    }

    return SessionState.CLOSED;
  }

  /**
   * @dev proposalApproval
   */
  function proposalApproval(uint256 _sessionId, uint256 _proposalId) override public
    onlyExistingProposal(_sessionId, _proposalId) view returns (bool)
  {
    Session storage session_ = sessions[_sessionId];
    Proposal storage proposal_ = session_.proposals[_proposalId];
    return session_.participation != 0
      && proposal_.approvals.mul(100).div(session_.participation) >= proposal_.requirement.majority
      && session_.participation.mul(100).div(session_.totalSupply) >= proposal_.requirement.quorum;
  }

  /**
   * @dev proposalStateAt
   */
  function proposalStateAt(uint256 _sessionId, uint256 _proposalId, uint256 _time)
    override public view returns (ProposalState)
  {
    Session storage session_ = sessions[_sessionId];
    SessionState sessionState = sessionStateAt(_sessionId, _time);

    if (sessionState == SessionState.UNDEFINED
      || _proposalId == 0 || _proposalId > session_.proposalsCount) {
      return ProposalState.UNDEFINED;
    }

    Proposal storage proposal_ = session_.proposals[_proposalId];

    if (proposal_.cancelled) {
      return ProposalState.CANCELLED;
    }

    if (sessionState < SessionState.CAMPAIGN) {
      return ProposalState.DEFINED;
    }

    if (sessionState < SessionState.EXECUTION) {
      return ProposalState.LOCKED;
    }

    if(proposal_.resolutionExecuted) {
      return ProposalState.RESOLVED;
    }

    if (sessionState == SessionState.CLOSED) {
      return ProposalState.ARCHIVED;
    }
    
    return proposalApproval(_sessionId, _proposalId) ? ProposalState.APPROVED : ProposalState.REJECTED;
  }

  /**
   * @dev updateSessionRule
   */
  function updateSessionRule(
    uint64 _campaignPeriod,
    uint64 _votingPeriod,
    uint64 _executionPeriod,
    uint64 _gracePeriod,
    uint64 _periodOffset,
    uint8 _openProposals,
    uint8 _maxProposals,
    uint8 _maxProposalsOperator,
    uint256 _newProposalThreshold
  )  override public onlyProxyOperator(Proxy(this)) returns (bool) {
    require(_campaignPeriod >= MIN_PERIOD_LENGTH && _campaignPeriod <= MAX_PERIOD_LENGTH, "VSM05");
    require(_votingPeriod >= MIN_PERIOD_LENGTH && _votingPeriod <= MAX_PERIOD_LENGTH, "VSM06");
    require(_executionPeriod >= MIN_PERIOD_LENGTH && _executionPeriod <= MAX_PERIOD_LENGTH, "VSM07");
    require(_gracePeriod > _campaignPeriod && _gracePeriod <= MAX_PERIOD_LENGTH, "VSM08");
    require(_periodOffset <= MAX_PERIOD_LENGTH, "VSM09");

    require(_openProposals <= _maxProposals, "VSM10");
    require(_maxProposalsOperator !=0, "VSM11");
    require(_newProposalThreshold != 0, "VSM12");

    if (currentSessionId_ != 0) {
      SessionState state = sessionStateAt(currentSessionId_, currentTime());
      require(state == SessionState.GRACE || state == SessionState.CLOSED, "VSM13");
    }

    sessionRule_ = SessionRule(
      _campaignPeriod,
      _votingPeriod,
      _executionPeriod,
      _gracePeriod,
      _periodOffset,
      _openProposals,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold);

    emit SessionRuleUpdated(
      _campaignPeriod,
      _votingPeriod,
      _executionPeriod,
      _gracePeriod,
      _periodOffset,
      _openProposals,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold);
    return true;
  }

  /**
   * @dev updateResolutionRequirements
   */
  function updateResolutionRequirements(
    address[] memory _targets,
    bytes4[] memory _methodSignatures,
    uint128[] memory _majorities,
    uint128[] memory _quorums,
    uint256[] memory _executionThresholds
  ) override public onlyProxyOperator(Proxy(this)) returns (bool)
  {
    require(_targets.length == _methodSignatures.length, "VSM14");
    require(_methodSignatures.length == _majorities.length, "VSM15");
    require(_methodSignatures.length == _quorums.length, "VSM16");
    require(_methodSignatures.length == _executionThresholds.length, "VSM17");

    if (currentSessionId_ != 0) {
      SessionState state = sessionStateAt(currentSessionId_, currentTime());
      require(state == SessionState.GRACE || state == SessionState.CLOSED, "VSM13");
    }

    for(uint256 i=0; i < _methodSignatures.length; i++) {
      // Majority can only be 0 if it is not the global default, allowing the deletion of the requirement
      require(_majorities[i] != 0 || !(_targets[i] == ANY_TARGET && _methodSignatures[i] == ANY_METHOD), "VSM18");
      require(_executionThresholds[i] != 0 || _majorities[i] == 0, "VSM19");

      resolutionRequirements[_targets[i]][_methodSignatures[i]] =
        ResolutionRequirement(_majorities[i], _quorums[i], _executionThresholds[i]);
      emit ResolutionRequirementUpdated(
         _targets[i], _methodSignatures[i], _majorities[i], _quorums[i], _executionThresholds[i]);
    }
    return true;
  }

  /**
   * @dev defineSponsor
   */
  function defineSponsor(address _sponsor, uint64 _until) override public returns (bool) {
    sponsors[msg.sender] = Sponsor(_sponsor, _until);
    emit SponsorDefined(msg.sender, _sponsor, _until);
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
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf) override public returns (bool)
  {
    Session storage session_ = loadSessionInternal();
    uint256 balance = token_.balanceOf(msg.sender);

    if (isProxyOperator(msg.sender, token_)) {
      require(session_.proposalsCount < sessionRule_.maxProposalsOperator, "VSM20");
    } else {
      require(session_.proposalsCount < sessionRule_.maxProposals, "VSM21");
      require(balance >= newProposalThresholdAt(currentSessionId_, session_.proposalsCount), "VSM22");
    }

    uint256 proposalId = ++session_.proposalsCount;
    updateProposalInternal(proposalId,
      _name, _url, _proposalHash, _resolutionTarget, _resolutionAction, _dependsOn, _alternativeOf);
    session_.proposals[proposalId].proposedBy = msg.sender;
 
    emit ProposalDefined(currentSessionId_, proposalId);
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
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf
  ) override public onlyExistingProposal(currentSessionId_, _proposalId) returns (bool)
  {
    uint256 sessionId = currentSessionId_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VSM23");
    require(msg.sender == sessions[sessionId].proposals[_proposalId].proposedBy, "VSM24");

    updateProposalInternal(_proposalId,
      _name, _url, _proposalHash, _resolutionTarget, _resolutionAction, _dependsOn, _alternativeOf);

    emit ProposalUpdated(sessionId, _proposalId);
    return true;
  }

  /**
   * @dev cancelProposal
   */
  function cancelProposal(uint256 _proposalId)
    override public onlyExistingProposal(currentSessionId_, _proposalId) returns (bool)
  {
    uint256 sessionId = currentSessionId_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VSM23");
    Proposal storage proposal_ = sessions[sessionId].proposals[_proposalId];
    
    require(msg.sender == proposal_.proposedBy, "VSM24");
    require(!proposal_.cancelled, "VSM25");
 
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
    submitVoteInternal(voters, _votes);
    return true;
  }

  /**
   * @dev submitVoteOnBehalf
   */
  function submitVoteOnBehalf(
    address[] memory _voters,
    uint256 _votes
  ) override public returns (bool)
  {
    submitVoteInternal(_voters, _votes);
    return true;
  }

  /**
   * @dev execute resolutions
   */
  function executeResolutions(uint256[] memory _proposalIds) override public returns (bool)
  {
    uint256 balance = ~uint256(0);
    if (!isProxyOperator(msg.sender, token_)) {
      balance = token_.balanceOf(msg.sender);
    }

    uint256 time = currentTime();
    uint256 sessionId = currentSessionId_;
    SessionState sessionState = sessionStateAt(sessionId, time);

    if (sessionState != SessionState.EXECUTION && sessionState != SessionState.GRACE) {
      sessionState = sessionStateAt(--sessionId, time);
      require(sessionState == SessionState.GRACE, "VSM26");
    }

    Session storage session_ = sessions[sessionId];
    for (uint256 i=0; i < _proposalIds.length; i++) {
      uint256 proposalId = _proposalIds[i];
      Proposal storage proposal_ = session_.proposals[proposalId];

      require(balance >= proposal_.requirement.executionThreshold, "VSM27");
      if (sessionState == SessionState.EXECUTION) {
        require(proposal_.resolutionTarget != address(this), "VSM28");
      } else {
        require(proposal_.resolutionTarget == address(this), "VSM29");
      }

      require(proposalStateAt(sessionId, proposalId, time) == ProposalState.APPROVED, "VSM30");

      proposal_.resolutionExecuted = true;
      if (proposal_.resolutionTarget != ANY_TARGET) {
        // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
        (bool success, ) = proposal_.resolutionTarget.call(proposal_.resolutionAction);
        require(success, "VSM31");
      }

      emit ResolutionExecuted(sessionId, proposalId);
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
    if (currentSessionId_ != 0) {
      state = sessionStateAt(currentSessionId_, time);
    }

    if(state != SessionState.PLANNED) {
      // Creation of a new session
      require(state == SessionState.GRACE || state == SessionState.CLOSED, "VSM32");
      uint256 nextStartAt = nextSessionAt(time);
      session_ = sessions[++currentSessionId_];
      session_.campaignAt = uint64(nextStartAt.sub(sessionRule_.campaignPeriod));
      session_.voteAt = uint64(nextStartAt);

      uint256 at = nextStartAt.add(sessionRule_.votingPeriod);
      session_.executionAt = uint64(at);
      at = at.add(sessionRule_.executionPeriod);
      session_.graceAt = uint64(at);
      at = at.add(sessionRule_.gracePeriod);
      session_.closedAt = uint64(at);

      session_.totalSupply = token_.totalSupply();

      require(ITokenCore(core).defineLock(
        address(this),
        nextStartAt,
        session_.graceAt,
        new address[](0)), "VSM33");

      emit SessionScheduled(currentSessionId_, session_.voteAt);
    } else {
      session_ = sessions[currentSessionId_];
    }
  }

  /**
   * @dev updateProposalInternal
   */
  function updateProposalInternal(
    uint256 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf) internal
  {
    Session storage session_ = sessions[currentSessionId_];
    Proposal storage proposal_ = session_.proposals[_proposalId];
    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;
    proposal_.dependsOn = _dependsOn;

    if (proposal_.alternativeOf != _alternativeOf) {
      if (proposal_.alternativeOf != 0) {
        session_.proposals[proposal_.alternativeOf].alternativesMask -= 2**(_proposalId-1);
      }
      if (_alternativeOf != 0) {
        session_.proposals[_alternativeOf].alternativesMask += 2**(_proposalId-1);
      }
      proposal_.alternativeOf = _alternativeOf;
    }

    bytes4 actionSignature = readSignatureInternal(proposal_.resolutionAction);
    ResolutionRequirement storage requirement =
      resolutionRequirements[proposal_.resolutionTarget][actionSignature];

    if (requirement.majority == 0) {
      requirement = resolutionRequirements[proposal_.resolutionTarget][bytes4(ANY_METHOD)];
    }

    if (requirement.majority == 0) {
      requirement = resolutionRequirements[ANY_TARGET][actionSignature];
    }

    if (requirement.majority == 0) {
      requirement = resolutionRequirements[ANY_TARGET][bytes4(ANY_METHOD)];
    }
    proposal_.requirement =
      ResolutionRequirement(
        requirement.majority,
        requirement.quorum,
        requirement.executionThreshold);
  }

  /**
   * @dev submit vote for proposals internal
   */
  function submitVoteInternal(
    address[] memory _voters,
    uint256 _votes) internal
  {
    require(sessionStateAt(currentSessionId_, currentTime()) == SessionState.VOTING, "VSM34");
    Session storage session_ = sessions[currentSessionId_];
    require(_voters.length > 0, "VSM35");

    uint256 weight = 0;
    uint64 time = uint64(currentTime());
    bool isOperator = isProxyOperator(msg.sender, token_);

    for(uint256 i=0; i < _voters.length; i++) {
      address voter = _voters[i];

      require(voter == msg.sender ||
        (isOperator && !ITokenCore(core).isSelfManaged(voter)) ||
        (sponsors[voter].address_ == msg.sender && sponsors[voter].until  >= time), "VSM36");
      require(lastVotes[voter] < session_.voteAt, "VSM37");
      uint256 balance = token_.balanceOf(voter);
      weight += balance;
      lastVotes[voter] = time;
      emit Vote(currentSessionId_, voter, balance);
    }

    uint256 remainingVotes = _votes;
    for(uint256 i=1; i <= session_.proposalsCount && remainingVotes != 0; i++) {
      Proposal storage proposal_ = session_.proposals[i];

      if (!proposal_.cancelled && (remainingVotes & 1) == 1) {
        if(proposal_.alternativeOf != 0) {
          Proposal storage baseProposal = session_.proposals[proposal_.alternativeOf];
          require (baseProposal.alternativesMask & _votes == 0, "VSM38");
        }

        proposal_.approvals += weight;
      }
      remainingVotes = remainingVotes >> 1;
    }
    require(remainingVotes == 0, "VSM39");

    session_.participation += weight;
  }
}
