pragma solidity ^0.6.0;

import "../voting/VotingSessionManager.sol";

/**
 * @title VotingSessionManager mock
 * @dev VotingSessionManager mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   VSMM01: Session has not started yet
 *   VSMM02: Session is already closed
 **/
contract VotingSessionManagerMock is VotingSessionManager {

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token)
    public VotingSessionManager(_token) {
  }

  /**
   * @dev nextSessionStepTest
   */
  function nextSessionStepTest() public returns (bool) {
    return nextStepTest(currentSessionId_);
  }

  /**
   * @dev nextStepTest
   */
  function nextStepTest(uint256 _sessionId) public returns (bool) {
    uint256 time = currentTime();
    SessionState state = sessionStateAt(_sessionId, time);
    Session storage session_ = sessions[_sessionId];

    require(state != SessionState.UNDEFINED, "VSMM01");
    require(state != SessionState.CLOSED, "VSMM02");
    uint256 voteAt = time;

    if (state == SessionState.PLANNED) {
      voteAt += (session_.voteAt - session_.campaignAt);
    }

    if (state == SessionState.CAMPAIGN) {
    }

    if (state == SessionState.VOTING) {
      voteAt -= (session_.executionAt - session_.voteAt);
    }

    if (state == SessionState.EXECUTION) {
      voteAt -= (session_.graceAt - session_.voteAt);
    }

    if (state == SessionState.GRACE) {
      voteAt -= (session_.closedAt - session_.voteAt);
    }

    session_.campaignAt = uint64(voteAt.sub(sessionRule_.campaignPeriod));
    session_.voteAt = uint64(voteAt);
    session_.executionAt = uint64(voteAt.add(sessionRule_.votingPeriod));
    session_.graceAt = uint64(voteAt.add(sessionRule_.votingPeriod)
      .add(sessionRule_.executionPeriod));
    session_.closedAt = uint64(voteAt.add(sessionRule_.votingPeriod)
      .add(sessionRule_.executionPeriod).add(sessionRule_.gracePeriod));
    return true;
  }
}
