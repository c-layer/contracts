pragma solidity >=0.5.0 <0.6.0;


/**
 * @title IPublicMultiSig
 * @dev IPublicMultiSig interface
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
**/
contract IPublicMultiSig {
  function () external payable;

  function threshold() public view returns (uint256);
  function duration() public view returns (uint256);

  function participantCount() public view returns (uint256);
  function participantWeight(address _participant)
    public view returns (uint256);

  function transactionCount() public view returns (uint256);
  function isConfirmed(uint256 _transactionId) public view returns (bool);
  function hasParticipated(uint256 _transactionId, address _participationId)
    public view returns (bool);

  function isLocked(uint256 _transactionId) public view returns (bool);
  function isExpired(uint256 _transactionId) public view returns (bool);
  function isCancelled(uint256 _transactionId) public view returns (bool);
  function transactionCreator(uint256 _transactionId)
    public view returns (address);

  function transactionCreatedAt(uint256 _transactionId)
    public view returns (uint256);

  function isExecuted(uint256 _transactionId) public view returns (bool);
  
  function execute(uint256 _transactionId) public returns (bool);

  function suggest(address payable _destination, uint256 _value, bytes memory _data)
    public returns (bool);

  function lockTransaction(uint256 _transactionId, bool _locked)
    public returns (bool);

  function cancelTransaction(uint256 _transactionId) public returns (bool);
  function approve(uint256 _transactionId) public returns (bool);
  function revokeApproval(uint256 _transactionId) public returns (bool);

  function addParticipant(address _participant, uint256 _weight)
    public returns (bool);

  function addManyParticipants(
    address[] memory _participants, uint256[] memory _weights)
    public returns (bool);

  function updateParticipant(address _participant, uint256 _weight)
    public returns (bool);

  function updateManyParticipants(
    address[] memory _participants, uint256[] memory _weights)
    public returns (bool);

  function updateConfiguration(uint256 _newThreeshold, uint256 _newDuration)
    public returns (bool);

  event TransactionAdded(uint256 indexed _transactionId);
  event TransactionCancelled(uint256 indexed _transactionId);
  event TransactionLocked(uint256 indexed _transactionId);
  event TransactionUnlocked(uint256 indexed _transactionId);
  event TransactionConfirmed(uint256 indexed _transactionId);
  event TransactionUnconfirmed(uint256 indexed _transactionId);

  event Execution(uint256 indexed _transactionId);
  event ExecutionFailure(uint256 indexed _transactionId);
  event ParticipantAdded(address indexed _participant, uint256 _weight);
  event ParticipantUpdated(address indexed _participant, uint256 _weight);
  event ConfigurationUpdated(uint256 _threshold, uint256 _duration);
}
