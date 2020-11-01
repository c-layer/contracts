pragma solidity ^0.6.0;

import "../interface/IVotingSessionDelegate.sol";
import "./VotingSessionStorage.sol";


/**
 * @title VotingSessionDelegate
 * @dev VotingSessionDelegate contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VD01: Session doesn't exist
 *   VD02: Proposal doesn't exist
 *   VD03: Campaign period must be within valid range
 *   VD04: Voting period must be within valid range
 *   VD05: Execution period must be within valid range
 *   VD06: Grace period must be within valid range
 *   VD07: Period offset must be within valid range
 *   VD08: Open proposals limit must be lower than the max proposals limit
 *   VD09: Operator proposal limit must be greater than 0
 *   VD10: New proposal threshold must be greater than 0
 *   VD11: The current session is not in GRACE, CLOSED or ARCHIVED state
 *   VD12: Duplicates entries are not allowed in non voting contracts
 *   VD13: Inconsistent numbers of methods signatures
 *   VD14: Inconsistent numbers of min participations
 *   VD15: Inconsistent numbers of quorums
 *   VD16: Inconsistent numbers of execution thresholds
 *   VD17: Default majority cannot be null
 *   VD18: Execute resolution threshold must be greater than 0
 *   VD19: Operator proposal limit is reached
 *   VD20: Too many proposals yet for this session
 *   VD21: Not enough tokens for a new proposal
 *   VD22: Current session is not in PLANNED state
 *   VD23: Only the author can update a proposal
 *   VD24: Proposal must not be already cancelled
 *   VD25: The previous session can only be in GRACE state to allow rules change
 *   VD26: Not enough tokens to execute
 *   VD27: Voting Session resolutions are not allowed in EXECUTION
 *   VD28: Only Voting Session operations are allowed in GRACE
 *   VD29: The proposal is not in APPROVED state
 *   VD30: Invalid resolution order
 *   VD31: The resolution must be successfull
 *   VD32: The session is too recent to be archived
 *   VD33: Unable to set the lock
 *   VD34: Cannot depends on itself or inexisting porposal
 *   VD35: Reference proposal for alternates must have the lowest proposalId
 *   VD36: Session is not in VOTING state
 *   VD37: Voters must be provided
 *   VD38: Sender must be either the voter, the voter's sponsor or an operator
 *   VD39: The voter must not have already voted for this session
 *   VD40: Cannot vote for a cancelled proposal
 *   VD41: Cannot submit multiple votes for a proposal and its alternatives
 *   VD42: The vote contains too many proposals
 */
contract VotingSessionDelegate is IVotingSessionDelegate, VotingSessionStorage {

  modifier onlyExistingSession(uint256 _sessionId) {
    require(_sessionId >= oldestSessionId_ && _sessionId <= currentSessionId_, "VD01");
    _;
  }

  modifier onlyExistingProposal(uint256 _sessionId, uint8 _proposalId) {
    require(_sessionId >= oldestSessionId_ && _sessionId <= currentSessionId_, "VD01");
    require(_proposalId > 0 && _proposalId <= sessions[_sessionId].proposalsCount, "VD02");
    _;
  }

  /**
   * @dev nextSessionAt
   */
  function nextSessionAt(uint256 _time) public override view returns (uint256 at) {
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
  function sessionStateAt(uint256 _sessionId, uint256 _time) public override
    view returns (SessionState)
  {
    if (_sessionId == 0 || _sessionId > currentSessionId_) {
      return SessionState.UNDEFINED;
    }

    if (_sessionId < oldestSessionId_) {
      return SessionState.ARCHIVED;
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
   * @dev newProposalThresholdAt
   */
  function newProposalThresholdAt(uint256 _sessionId, uint256 _proposalsCount)
    public override onlyExistingSession(_sessionId) view returns (uint256)
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
   * @dev proposalApproval
   */
  function proposalApproval(uint256 _sessionId, uint8 _proposalId)
    public override view onlyExistingProposal(_sessionId, _proposalId) returns (bool)
  {
    Session storage session_ = sessions[_sessionId];
    if (session_.participation == 0) {
      return false;
    }

    uint256 participation = session_.participation.mul(PERCENT).div(session_.totalSupply);

    Proposal storage proposal_ = session_.proposals[_proposalId];
    bool isApproved = (
      (proposal_.approvals.mul(PERCENT).div(session_.participation) >= proposal_.requirement.majority) &&
      (participation >= proposal_.requirement.quorum)
    );
    if (!isApproved) {
      return false;
    }

    /**
     * @notice when the proposal has fulfiled its own requirements,
     * @notice its approvals must be also compared to alternative proposals if they exist
     */
    if (proposal_.alternativeOf != 0 || proposal_.alternativesMask != 0) {
      uint256 baseProposalId = (proposal_.alternativeOf == 0) ?
        _proposalId : proposal_.alternativeOf;
      Proposal storage baseProposal = session_.proposals[proposal_.alternativeOf];

      uint256 alternativesMask = baseProposal.alternativesMask >> (baseProposalId - 1);

      for (uint256 i = baseProposalId; i <= session_.proposalsCount && alternativesMask != 0; i++) {
        if (((alternativesMask & 1) != 1) && (i != _proposalId)) {
          continue;
        }

        Proposal storage alternative = session_.proposals[i];
        if ((alternative.approvals > proposal_.approvals) &&
          (alternative.approvals.mul(PERCENT).div(session_.participation) >= alternative.requirement.majority) &&
          (participation >= alternative.requirement.quorum))
        {
          return false;
        }
        alternativesMask = alternativesMask >> 1;
      }
    }
    return isApproved;
  }

  /**
   * @dev proposalStateAt
   */
  function proposalStateAt(uint256 _sessionId, uint8 _proposalId, uint256 _time)
    public override view returns (ProposalState)
  {
    Session storage session_ = sessions[_sessionId];
    SessionState sessionState = sessionStateAt(_sessionId, _time);

    if (sessionState == SessionState.ARCHIVED) {
      return ProposalState.ARCHIVED;
    }

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

    if (proposal_.resolutionExecuted) {
      return ProposalState.RESOLVED;
    }

    if (sessionState == SessionState.CLOSED) {
      return ProposalState.CLOSED;
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
    uint256 _newProposalThreshold,
    address[] memory _nonVotingAddresses
  )  public override returns (bool) {
    require(_campaignPeriod >= MIN_PERIOD_LENGTH && _campaignPeriod <= MAX_PERIOD_LENGTH, "VD03");
    require(_votingPeriod >= MIN_PERIOD_LENGTH && _votingPeriod <= MAX_PERIOD_LENGTH, "VD04");
    require(_executionPeriod >= MIN_PERIOD_LENGTH && _executionPeriod <= MAX_PERIOD_LENGTH, "VD05");
    require(_gracePeriod > _campaignPeriod && _gracePeriod <= MAX_PERIOD_LENGTH, "VD06");
    require(_periodOffset <= MAX_PERIOD_LENGTH, "VD07");

    require(_openProposals <= _maxProposals, "VD08");
    require(_maxProposalsOperator !=0, "VD09");
    require(_newProposalThreshold != 0, "VD10");

    if (currentSessionId_ != 0) {
      SessionState state = sessionStateAt(currentSessionId_, currentTime());
      require(state == SessionState.GRACE ||
        state == SessionState.CLOSED || state == SessionState.ARCHIVED, "VD11");
    }

    uint256 currentTime_ = currentTime();
    for (uint256 i=0; i < sessionRule_.nonVotingAddresses.length; i++) {
      lastVotes[sessionRule_.nonVotingAddresses[i]] = uint64(currentTime_);
    }

    for (uint256 i=0; i < _nonVotingAddresses.length; i++) {
      lastVotes[_nonVotingAddresses[i]] = ~uint64(0);

      for (uint256 j=i+1; j < _nonVotingAddresses.length; j++) {
        require(_nonVotingAddresses[i] != _nonVotingAddresses[j], "VD12");
      }
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
      _newProposalThreshold,
      _nonVotingAddresses);

    emit SessionRuleUpdated(
      _campaignPeriod,
      _votingPeriod,
      _executionPeriod,
      _gracePeriod,
      _periodOffset,
      _openProposals,
      _maxProposals,
      _maxProposalsOperator,
      _newProposalThreshold,
      _nonVotingAddresses);
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
  ) public override returns (bool)
  {
    require(_targets.length == _methodSignatures.length, "VD13");
    require(_methodSignatures.length == _majorities.length, "VD14");
    require(_methodSignatures.length == _quorums.length, "VD15");
    require(_methodSignatures.length == _executionThresholds.length, "VD16");

    if (currentSessionId_ != 0) {
      SessionState state = sessionStateAt(currentSessionId_, currentTime());
      require(state == SessionState.GRACE ||
        state == SessionState.CLOSED || state == SessionState.ARCHIVED, "VD11");
    }

    for (uint256 i=0; i < _methodSignatures.length; i++) {
      // Majority can only be 0 if it is not the global default, allowing the deletion of the requirement
      require(_majorities[i] != 0 || !(_targets[i] == ANY_TARGET && _methodSignatures[i] == ANY_METHOD), "VD17");
      require(_executionThresholds[i] != 0 || _majorities[i] == 0, "VD18");

      resolutionRequirements[_targets[i]][_methodSignatures[i]] =
        ResolutionRequirement(_majorities[i], _quorums[i], _executionThresholds[i]);
      emit ResolutionRequirementUpdated(
         _targets[i], _methodSignatures[i], _majorities[i], _quorums[i], _executionThresholds[i]);
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
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf) public override returns (bool)
  {
    Session storage session_ = loadSessionInternal();

    if (core_.hasProxyPrivilege(msg.sender, address(this), msg.sig)) {
      require(session_.proposalsCount < sessionRule_.maxProposalsOperator, "VD19");
    } else {
      require(session_.proposalsCount < sessionRule_.maxProposals, "VD20");
      require(token_.balanceOf(msg.sender) >=
        newProposalThresholdAt(currentSessionId_, session_.proposalsCount), "VD21");
    }

    uint8 proposalId = ++session_.proposalsCount;
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
    uint8 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf
  ) public override onlyExistingProposal(currentSessionId_, _proposalId) returns (bool)
  {
    uint256 sessionId = currentSessionId_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VD22");
    require(msg.sender == sessions[sessionId].proposals[_proposalId].proposedBy, "VD23");

    updateProposalInternal(_proposalId,
      _name, _url, _proposalHash, _resolutionTarget, _resolutionAction, _dependsOn, _alternativeOf);

    emit ProposalUpdated(sessionId, _proposalId);
    return true;
  }

  /**
   * @dev cancelProposal
   */
  function cancelProposal(uint8 _proposalId)
    public override onlyExistingProposal(currentSessionId_, _proposalId) returns (bool)
  {
    uint256 sessionId = currentSessionId_;
    require(sessionStateAt(sessionId, currentTime()) == SessionState.PLANNED, "VD22");
    Proposal storage proposal_ = sessions[sessionId].proposals[_proposalId];
    
    require(msg.sender == proposal_.proposedBy, "VD23");
    require(!proposal_.cancelled, "VD24");

    proposal_.cancelled = true;
    emit ProposalCancelled(sessionId, _proposalId);
    return true;
  }

  /**
   * @dev submitVote
   */
  function submitVote(uint256 _votes) public override returns (bool)
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
  ) public override returns (bool)
  {
    submitVoteInternal(_voters, _votes);
    return true;
  }

  /**
   * @dev execute resolutions
   */
  function executeResolutions(uint8[] memory _proposalIds) public override returns (bool)
  {
    uint256 balance;
    if (core_.hasProxyPrivilege(msg.sender, address(this), msg.sig)) {
      balance = ~uint256(0);
    } else {
      balance = token_.balanceOf(msg.sender);
    }

    uint256 currentTime_ = currentTime();
    uint256 sessionId = currentSessionId_;
    SessionState sessionState = sessionStateAt(sessionId, currentTime_);

    if (sessionState != SessionState.EXECUTION && sessionState != SessionState.GRACE) {
      sessionState = sessionStateAt(--sessionId, currentTime_);
      require(sessionState == SessionState.GRACE, "VD25");
    }

    Session storage session_ = sessions[sessionId];
    for (uint256 i=0; i < _proposalIds.length; i++) {
      uint8 proposalId = _proposalIds[i];
      Proposal storage proposal_ = session_.proposals[proposalId];

      require(balance >= proposal_.requirement.executionThreshold, "VD26");
      if (sessionState == SessionState.EXECUTION) {
        require(proposal_.resolutionTarget != address(this), "VD27");
      } else {
        require(proposal_.resolutionTarget == address(this), "VD28");
      }

      require(proposalStateAt(sessionId, proposalId, currentTime_) == ProposalState.APPROVED, "VD29");
      if (proposal_.dependsOn != 0) {
        ProposalState dependsOnState = proposalStateAt(sessionId, proposal_.dependsOn, currentTime_);
        require(dependsOnState != ProposalState.APPROVED, "VD30");
      }

      proposal_.resolutionExecuted = true;
      if (proposal_.resolutionTarget != ANY_TARGET) {
        // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
        (bool success, ) = proposal_.resolutionTarget.call(proposal_.resolutionAction);
        require(success, "VD31");
      }

      emit ResolutionExecuted(sessionId, proposalId);
    }
    return true;
  }

  /**
   * @dev archiveSession
   **/
  function archiveSession() public override onlyExistingSession(oldestSessionId_) returns (bool) {
    Session storage session_ = sessions[oldestSessionId_];
    require((currentSessionId_ >= (oldestSessionId_ + SESSION_RETENTION_COUNT)) ||
      (currentTime() > (SESSION_RETENTION_PERIOD + session_.voteAt)), "VD32");
    for (uint256 i=0; i < session_.proposalsCount; i++) {
      delete session_.proposals[i];
    }
    delete sessions[oldestSessionId_];
    emit SessionArchived(oldestSessionId_++);
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
    uint256 currentTime_ = currentTime();

    SessionState state = SessionState.CLOSED;
    if (currentSessionId_ != 0) {
      state = sessionStateAt(currentSessionId_, currentTime_);
    }

    if (state != SessionState.PLANNED) {
      // Creation of a new session
      require(state == SessionState.GRACE ||
        state == SessionState.CLOSED || state == SessionState.ARCHIVED, "VD11");
      uint256 nextStartAt = nextSessionAt(currentTime_);
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

      require(core_.defineLock(
        address(this),
        ANY_ADDRESSES,
        ANY_ADDRESSES,
        session_.voteAt,
        session_.executionAt), "VD33");

      emit SessionScheduled(currentSessionId_, session_.voteAt);

      if (currentSessionId_ >= (oldestSessionId_ + SESSION_RETENTION_COUNT)) {
        // Archiving of the oldest session
        archiveSession();
      }
    } else {
      session_ = sessions[currentSessionId_];
    }
  }

  /**
   * @dev updateProposalInternal
   */
  function updateProposalInternal(
    uint8 _proposalId,
    string memory _name,
    string memory _url,
    bytes32 _proposalHash,
    address _resolutionTarget,
    bytes memory _resolutionAction,
    uint8 _dependsOn,
    uint8 _alternativeOf) internal
  {
    Session storage session_ = sessions[currentSessionId_];

    require(_dependsOn <= session_.proposalsCount && _dependsOn != _proposalId, "VD34");
    require(_alternativeOf < _proposalId, "VD35");

    Proposal storage proposal_ = session_.proposals[_proposalId];
    proposal_.name = _name;
    proposal_.url = _url;
    proposal_.proposalHash = _proposalHash;
    proposal_.resolutionTarget = _resolutionTarget;
    proposal_.resolutionAction = _resolutionAction;
    proposal_.dependsOn = _dependsOn;

    if (proposal_.alternativeOf != _alternativeOf) {
      uint256 proposalBit = 1 << uint256(_proposalId-1);

      Proposal storage baseProposal;
      if (proposal_.alternativeOf != 0) {
        baseProposal = session_.proposals[proposal_.alternativeOf];
        baseProposal.alternativesMask ^= proposalBit;
      }
      if (_alternativeOf != 0) {
        baseProposal = session_.proposals[_alternativeOf];
        baseProposal.alternativesMask |= (1 << uint256(_alternativeOf-1)) | proposalBit;
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

  function updateVotingSupply() internal {
    Session storage session_ = sessions[currentSessionId_];
    session_.votingSupply = session_.totalSupply;
    for (uint256 i=0; i < sessionRule_.nonVotingAddresses.length; i++) {
      session_.votingSupply =
        session_.votingSupply.sub(token_.balanceOf(sessionRule_.nonVotingAddresses[i]));
    }
  }


  /**
   * @dev submit vote for proposals internal
   */
  function submitVoteInternal(
    address[] memory _voters,
    uint256 _votes) internal
  {
    require(sessionStateAt(currentSessionId_, currentTime()) == SessionState.VOTING, "VD36");
    Session storage session_ = sessions[currentSessionId_];
    require(_voters.length > 0, "VD37");

    if(session_.participation == 0) {
      // The token is now locked and supply should not change anymore
      updateVotingSupply();
    }

    uint256 weight = 0;
    uint64 currentTime_ = uint64(currentTime());

    for (uint256 i=0; i < _voters.length; i++) {
      address voter = _voters[i];

      require(voter == msg.sender ||
        (core_.hasProxyPrivilege(msg.sender, address(this), msg.sig) && !core_.isSelfManaged(voter)) ||
        (sponsors[voter].address_ == msg.sender && sponsors[voter].until  >= currentTime_), "VD38");
      require(lastVotes[voter] < session_.voteAt, "VD39");
      uint256 balance = token_.balanceOf(voter);
      weight += balance;
      lastVotes[voter] = currentTime_;
      emit Vote(currentSessionId_, voter, balance);
    }

    uint256 remainingVotes = _votes;
    for (uint256 i=1; i <= session_.proposalsCount && remainingVotes != 0; i++) {
      if ((remainingVotes & 1) == 1) {
        Proposal storage proposal_ = session_.proposals[i];

        require(!proposal_.cancelled, "VD40");
        if (proposal_.alternativeOf != 0) {
          Proposal storage baseProposal = session_.proposals[proposal_.alternativeOf];
          require (baseProposal.alternativesMask & _votes == (1 << (i-1)), "VD41");
        }

        proposal_.approvals += weight;
      }
      remainingVotes = remainingVotes >> 1;
    }
    require(remainingVotes == 0, "VD42");
    session_.participation += weight;
  }
}
