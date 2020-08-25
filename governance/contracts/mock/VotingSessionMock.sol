pragma solidity ^0.6.0;

import "../voting/VotingSession.sol";

/**
 * @title VotingSession mock
 * @dev VotingSession mock
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 **/
contract VotingSessionMock is VotingSession {

  /**
   * @dev constructor
   */
  constructor(ITokenProxy _token)
    public VotingSession(_token) {
  }

  /**
   * @dev nextSessionStepTest
   */
  function nextSessionStepTest() public returns (bool) {
    uint256 time = currentTime();
    SessionState state = sessionStateAt(sessionsCount_ - 1, time);
    Session storage session_ = sessions[sessionsCount_ - 1];

    require(state != SessionState.CLOSED, "VSMXX");
    uint256 startAt = time;

    if (state == SessionState.PLANNED) {
      startAt = time + sessionRule_.campaignPeriod;
    }

    if (state == SessionState.CAMPAIGN) {
      startAt = time;
    }

    if (state == SessionState.VOTING) {
      startAt = time
        - sessionRule_.votingPeriod;
    }

    if (state == SessionState.REVEAL) {
      startAt = time
        - sessionRule_.votingPeriod
        - sessionRule_.revealPeriod;
    }

    if (state == SessionState.GRACE) {
      startAt = time
        - sessionRule_.votingPeriod
        - sessionRule_.revealPeriod
        - sessionRule_.gracePeriod;
    }

    session_.startAt = uint64(startAt);
    return true;
  }
}
