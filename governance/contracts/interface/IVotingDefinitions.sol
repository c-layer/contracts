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

  address internal constant ANY_TARGET = address(bytes20("AnyTarget"));
  bytes4 internal constant ANY_METHOD = bytes4(bytes32("AnyMethod"));

  enum SessionState {
    PLANNED,
    CAMPAIGN,
    VOTING,
    GRACE,
    CLOSED
  }

  uint64 internal constant MIN_PERIOD_LENGTH = 5 minutes;
  // MAX_PERIOD_LENGTH (approx 10000 years) protects against period overflow
  uint64 internal constant MAX_PERIOD_LENGTH = 3652500 days;
  uint64 internal constant CAMPAIGN_PERIOD = 5 days;
  uint64 internal constant VOTING_PERIOD = 2 days;
  uint64 internal constant GRACE_PERIOD = 7 days;
  uint64 internal constant OFFSET_PERIOD = 2 days;

  // Proposal requirements in percent
  uint256 internal constant NEW_PROPOSAL_THRESHOLD = 1;
  uint256 internal constant EXECUTE_RESOLUTION_THRESHOLD = 1;
  uint256 internal constant DEFAULT_MAJORITY = 50;
  uint256 internal constant DEFAULT_QUORUM = 60;

  uint8 internal constant MAX_PROPOSALS = 10;
  uint8 internal constant MAX_PROPOSALS_OPERATOR = 25;
  uint8 internal constant MAX_PROPOSALS_HARD_LIMIT = 255;
}
