pragma solidity ^0.6.0;


/**
 * @title IVotingDefinitions
 * @dev IVotingDefinitions interface
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 */
abstract contract IVotingDefinitions {

  enum SessionState {
    PLANNED,
    CAMPAIGN,
    VOTING,
    REVEAL,
    GRACE,
    CLOSED
  }

  uint64 internal constant CAMPAIGN_PERIOD = 5 days;
  uint64 internal constant VOTING_PERIOD = 2 days;
  uint64 internal constant REVEAL_PERIOD = 2 days;
  uint64 internal constant GRACE_PERIOD = 5 days;

  // Proposal requirements in percent
  uint256 internal constant NEW_PROPOSAL_THRESHOLD = 1;
  uint256 internal constant DEFAULT_MAJORITY = 50;
  uint256 internal constant DEFAULT_QUORUM = 40;

  uint8 internal constant MAX_PROPOSALS = 100;
  uint8 internal constant MAX_PROPOSALS_QUAESTOR = 255;
}
