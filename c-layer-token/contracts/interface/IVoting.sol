pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IVoting
 * @dev IVoting interface
 * @author Cyril Lapinte - <cyril@openfiz.com>
*/
contract IVoting {

  /* Core Voting */
  function proposalsCount() public view returns (uint256);
  function proposalQuestion(uint256 _proposalId) public view returns (string memory);
  function proposalUrl(uint256 proposalId) public view returns (string memory);
  function proposalHash(uint256 proposalId) public view returns (uint256);
  function proposalOptionsAvailable(uint256 proposalId)
    public view returns (uint8);

  function participation(uint256 proposalId) public view returns (uint256);
  function proposalCreatedAt(uint256 proposalId) public view returns (uint256);
  function ballot(uint256 proposalId) public view returns (uint256[] memory);
  function optionVoted(uint256 proposalId, address participant)
    public view returns (uint8);

  function isDeclared(uint256 _proposalId, address _participant)
    public view returns (bool);

  function isVoteLocked(uint256 _proposalId, address _participant)
    public view returns (bool);
  
  /* Voting rule */
  function defaultDuration() public view returns (uint256);
  function defaultQuorum() public view returns (uint256);
  function defaultMinScore() public view returns (uint256);
  function latestVotingTime() public view returns (uint256);
  function voteDuration(uint256 _proposalId) public view returns (uint256);
  function voteQuorum(uint256 _proposalId) public view returns (uint256);
  function voteMinScore(uint256 _proposalId) public view returns (uint256);
  function isOnGoing(uint256 proposalId) public view returns (bool);
  function areAnyOnGoing() public view returns (bool);
  function result(uint256 proposalId) public view returns (uint256);

  /* Actions */
  function addProposal(
    string memory question,
    string memory url,
    uint256 hash,
    uint8 optionsAvailable
    ) public;

  function vote(uint256 proposalId, uint8 option) public;
  function lockVote(uint256 _proposalId, uint8 _option) public;
  function closeVote(uint256 proposalId) public;
  function updateVotingRule(
    uint256 duration,
    uint256 quorum,
    uint256 minScore) public;
  
  /* Events */
  event ProposalAdded(uint256 proposalId);
  event VotingRuleUpdated(
    uint256 duration,
    uint256 minParticipants,
    uint256 minRelativeMajority
  );
  event VoteClosed(uint256 proposalId);
}
