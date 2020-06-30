pragma solidity ^0.6.0;

import "@c-layer/common/contracts/math/SafeMath.sol";
import "@c-layer/common/contracts/operable/Operable.sol";


/**
 * @title VotingCore
 * @dev VotingCore contract
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * VC01: Summary must be defined
 * VC02: Url must be defined
 * VC03: Hash must be defined
 * VC04: Option must exist
 * VC05: Proposal must exist
 * VC06: Vote must be new or changed
 */
contract VotingCore is Operable {
  using SafeMath for uint256;

  struct Vote {
    uint8 option;
    bool declared;
    bool locked;
  }

  struct Proposal {
    string summary;
    string url;
    uint256 hash;
    uint256 participation;
    uint256 createdAt;
    uint256[] ballot; // ballot[0] correspond to blank vote
    mapping(address => Vote) votes;
  }

  mapping(uint256 => Proposal) internal proposals_;
  uint256 internal proposalsCount_;

  /**
   * @dev returns the count of proposals
   */
  function proposalsCount() public view returns (uint256) {
    return proposalsCount_;
  }

  /**
   * @dev returns the summary of the proposal _proposalId
   */
  function proposalSummary(uint256 _proposalId) public view returns (string memory) {
    return proposals_[_proposalId].summary;
  }

  /**
   * @dev returns the url of the proposal _proposalId
   */
  function proposalUrl(uint256 _proposalId) public view returns (string memory) {
    return proposals_[_proposalId].url;
  }

  /**
   * @dev returns the hash of the proposal _proposalId
   */
  function proposalHash(uint256 _proposalId) public view returns (uint256) {
    return proposals_[_proposalId].hash;
  }

  /**
   * @dev returns the number of choices of the proposal _proposalId
   */
  function proposalOptionsAvailable(uint256 _proposalId)
    public view returns (uint8)
  {
    return uint8(proposals_[_proposalId].ballot.length-1);
  }

  /**
   * @dev returns the participation of the proposal _proposalId
   * The participation is the number of votes that has been used for this proposal
   */
  function participation(uint256 _proposalId) public view returns (uint256) {
    return proposals_[_proposalId].participation;
  }

  /**
   * @dev returns the time of creation of the proposal _proposalId
   */
  function proposalCreatedAt(uint256 _proposalId)
    public view returns (uint256)
  {
    return proposals_[_proposalId].createdAt;
  }

  /**
   * @dev returns the ballot of the proposal _proposalId
   */
  function ballot(uint256 _proposalId) public view returns (uint256[] memory) {
    return proposals_[_proposalId].ballot;
  }

  /**
   * @dev returns the choice made by a participant for a proposal
   */
  function optionVoted(uint256 _proposalId, address _participant)
    public view returns (uint8)
  {
    return proposals_[_proposalId].votes[_participant].option;
  }

  /**
   * @dev returns true if the participant is declared
   */
  function isDeclared(uint256 _proposalId, address _participant)
    public view returns (bool)
  {
    return proposals_[_proposalId].votes[_participant].declared;
  }

  /**
   * @dev returns true if the participant is declared and lock his vote
   */
  function isVoteLocked(uint256 _proposalId, address _participant)
    public view returns (bool)
  {
    return proposals_[_proposalId].votes[_participant].locked;
  }

  /**
   * @dev add a proposal
   */
  function addProposal(
    string memory _summary,
    string memory _url,
    uint256 _hash,
    uint8 _optionsAvailable
  ) public virtual onlyOperator
  {
    require(bytes(_summary).length > 0, "VC01");
    require(bytes(_url).length > 0, "VC02");
    require(_hash > 0, "VC03");

    proposals_[proposalsCount_] = Proposal(
      _summary,
      _url,
      _hash,
      0,
      // solhint-disable-next-line not-rely-on-time
      block.timestamp,
      new uint256[](_optionsAvailable+1)
    );
    proposalsCount_++;
    emit ProposalAdded(proposalsCount_-1);
  }

  /**
   * @dev vote for a proposal
   */
  function vote(uint256 _proposalId, uint8 _option) public virtual {
    weightedVote(_proposalId, _option, 1);
  }

  /**
   * @dev vote for a proposal and lock it
   */
  function lockVote(uint256 _proposalId, uint8 _option) public {
    vote(_proposalId, _option);
    proposals_[_proposalId].votes[msg.sender].locked = true;
  }

  /**
   * @dev vote for a proposal with a weight
   *
   * Child contract must define the correct weight for the msg.sender
   */
  function weightedVote(
    uint256 _proposalId,
    uint8 _option,
    uint256 _weight) internal
  {
    Proposal storage proposal = proposals_[_proposalId];
    Vote storage lastVote = proposal.votes[msg.sender];

    require(_option < proposals_[_proposalId].ballot.length, "VC04");
    require(_proposalId < proposalsCount_, "VC05");
    require(lastVote.option != _option, "VC06");

    if (proposal.votes[msg.sender].declared) {
      proposal.ballot[lastVote.option] = proposal
        .ballot[lastVote.option].sub(_weight);
    } else {
      proposal.participation = proposal.participation.add(_weight);
      proposal.votes[msg.sender].declared = true;
    }

    proposal.ballot[_option] = proposal.ballot[_option].add(_weight);
    proposal.votes[msg.sender].option = _option;
  }

  event ProposalAdded(uint256 proposalId);
}
