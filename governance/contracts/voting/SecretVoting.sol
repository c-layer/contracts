pragma solidity ^0.6.0;

import "./Voting.sol";


/**
 * @title SecretVoting
 * @dev SecretVoting contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * SV01: Vote must not be locked
 * SV02: Vote must be locked
 * SV03: Vote revealed must matched the vote locked
 */
contract SecretVoting is Voting {

  mapping(uint256 => mapping(address => bytes32)) private hashes_;

  /**
   * @dev lock the participant vote hash for a proposal
   */
  function lockHash(uint256 _proposalId, bytes32 _hash) public {
    require(!proposals_[_proposalId].votes[msg.sender].locked, "SV01");
    hashes_[_proposalId][msg.sender] = _hash;
    proposals_[_proposalId].votes[msg.sender].locked = true;
  }

  /**
   * @dev reveal the vote
   */
  function revealHash(
    uint256 _proposalId,
    uint8 _option,
    uint256 _salt) public
  {
    require(proposals_[_proposalId].votes[msg.sender].locked, "SV02");
    require(
      keccak256(
        abi.encodePacked(
          _proposalId,
          _option,
          msg.sender,
          _salt
        )
      ) == hashes_[_proposalId][msg.sender],
      "SV03"
    );
    vote(_proposalId, _option);
  }
}
