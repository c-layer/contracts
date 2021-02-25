pragma solidity ^0.8.0;

import "@c-layer/common/contracts/operable/Operable.sol";
import "../../interface/IPublicMultiSig.sol";


/**
 * @title PublicMultiSig
 * @dev PublicMultiSig contract
 * Every one can suggest a new transaction
 * Every one can execut it once it is approved
 * If a threshold is defined, only participants with a weight > 0
 *   will be able to influence the approval
 * With a threshold of 0, approval is not required any more.
 * Only participants can approved transaction based on their weight
 *
 * @author Cyril Lapinte - <cyril@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 * PMS01: Transaction is expired
 * PMS02: Transaction is cancelled
 * PMS03: Transaction is executed
 * PMS04: Transaction is locked
 * PMS05: Transaction is not confirmed
 * PMS06: Only creator can lock a transaction
 * PMS07: Only creator or owner can cancel a transaction
 * PMS08: Transaction is already confirmed
 * PMS09: Invalid transaction id
 * PMS10: Transaction is already unapproved
 */
contract PublicMultiSig is IPublicMultiSig, Operable {

  uint256 internal threshold_;
  uint256 internal duration_;

  struct Participant {
    uint256 weight;
  }
  mapping(address => Participant) internal participants;
  uint256 internal participantCount_;

  struct Transaction {
    address payable destination;
    uint256 value;
    bytes data;
    uint256 confirmed;
    bool locked;
    bool cancelled;
    address creator;
    uint256 createdAt;
    bool executed;
    mapping(address => bool) confirmations;
  }
  mapping(uint256 => Transaction) internal transactions;
  uint256 internal transactionCount_;

  /**
   * @dev Modifier for active transaction
   */
  modifier whenActive(uint256 _transactionId) {
    require(!isExpired(_transactionId), "PMS01");
    require(!transactions[_transactionId].cancelled, "PMS02");
    require(!transactions[_transactionId].executed, "PMS03");
    _;
  }

  /**
   * @dev contructor
   **/
  constructor(
    uint256 _threshold,
    uint256 _duration,
    address[] memory _participants,
    uint256[] memory _weights
  )
  {
    threshold_ = _threshold;
    duration_ = _duration;

    defineOperator("MultiSig", address(this));
    owner = address(this);
    updateManyParticipants(_participants, _weights);
  }

  /**
   * @dev receive function
   */
  // solhint-disable-next-line no-empty-blocks
  receive() external payable {}

  /**
   * @dev fallback function
   */
  // solhint-disable-next-line no-empty-blocks
  fallback() external payable {}

  /**
   * @dev threshold
   */
  function threshold() public view returns (uint256) {
    return threshold_;
  }

  /**
   * @dev duration
   */
  function duration() public view returns (uint256) {
    return duration_;
  }

  /**
   * @dev participant weight
   */
  function participantWeight(address _address) public view returns (uint256) {
    return participants[_address].weight;
  }

  /**
   * @dev participant count
   */
  function participantCount() public view returns (uint256) {
    return participantCount_;
  }

  /**
   * @dev transaction count
   */
  function transactionCount() public view returns (uint256) {
    return transactionCount_;
  }

  /**
   * @dev isConfirmed
   */
  function isConfirmed(uint256 _transactionId) public view returns (bool) {
    return transactions[_transactionId].confirmed >= threshold_;
  }

  /**
   * @dev hasParticipated
   */
  function hasParticipated(uint256 _transactionId, address _participationId)
    public view returns (bool)
  {
    return transactions[_transactionId].confirmations[_participationId];
  }

  /**
   * @dev isLocked
   */
  function isLocked(uint256 _transactionId) public view returns (bool) {
    return transactions[_transactionId].locked;
  }

  /**
   * @dev isExpired
   */
  function isExpired(uint256 _transactionId) public view returns (bool) {
    return
      transactions[_transactionId].createdAt + duration_ < currentTime();
  }

  /**
   * @dev toBeExpiredAt
   */
  function toBeExpiredAt(uint256 _transactionId)
    public view returns (uint256)
  {
    return transactions[_transactionId].createdAt + duration_;
  }

  /**
   * @dev isCancelled
   */
  function isCancelled(uint256 _transactionId) public view returns (bool) {
    return transactions[_transactionId].cancelled;
  }

  /**
   * @dev transactionDestination
   */
  function transactionDestination(uint256 _transactionId)
    public view returns (address)
  {
    return transactions[_transactionId].destination;
  }

  /**
   * @dev transactionValue
   */
  function transactionValue(uint256 _transactionId)
    public view returns (uint256)
  {
    return transactions[_transactionId].value;
  }

  /**
   * @dev transactionData
   */
  function transactionData(uint256 _transactionId)
    public view returns (bytes memory)
  {
    return transactions[_transactionId].data;
  }

  /**
   * @dev transactionCreator
   */
  function transactionCreator(uint256 _transactionId)
    public view returns (address)
  {
    return transactions[_transactionId].creator;
  }

  /**
   * @dev transactionCreatedAt
   */
  function transactionCreatedAt(uint256 _transactionId)
    public view returns (uint256)
  {
    return transactions[_transactionId].createdAt;
  }

  /**
   * @dev isExecutable
   */
  function isExecutable(uint256 _transactionId) public virtual view returns (bool) {
    return !transactions[_transactionId].locked && (
      !transactions[_transactionId].cancelled) && ( 
      !transactions[_transactionId].executed) && (
      !isExpired(_transactionId)) && (
      transactions[_transactionId].confirmed >= threshold_);
  }

  /**
   * @dev isExecuted
   */
  function isExecuted(uint256 _transactionId) public view returns (bool) {
    return transactions[_transactionId].executed;
  }

  /**
   * @dev execute
   * Execute a transaction with a specific id
   */
  function execute(uint256 _transactionId)
    public virtual whenActive(_transactionId) returns (bool)
  {
    require(!transactions[_transactionId].locked, "PMS04");
    require(
      transactions[_transactionId].confirmed >= threshold_,
      "PMS05");

    Transaction storage transaction = transactions[_transactionId];
    transaction.executed = true;
  
    (bool success, ) =
    // solhint-disable-next-line avoid-call-value, avoid-low-level-calls
    transaction.destination.call{value: transaction.value}(transaction.data);
    if (success) {
      emit Execution(_transactionId);
    } else {
      transaction.executed = false;
      emit ExecutionFailure(_transactionId);
    }
    return true;
  }

  /**
   * @dev suggest a new transaction
   */
  function suggest(address payable _destination, uint256 _value, bytes memory _data)
    public virtual returns (bool)
  {
    Transaction storage transaction = transactions[transactionCount_];
    transaction.destination = _destination;
    transaction.value = _value;
    transaction.data = _data;
    transaction.creator = msg.sender;
    transaction.createdAt = currentTime();
    emit TransactionAdded(transactionCount_);
    transactionCount_++;
    return true;
  }

  /**
   * @dev set the lock state of a transaction
   */
  function lockTransaction(uint256 _transactionId, bool _locked)
    public virtual whenActive(_transactionId) returns (bool)
  {
    require(
      transactions[_transactionId].creator == msg.sender,
      "PMS06");

    if (transactions[_transactionId].locked == _locked) {
      return true;
    }

    transactions[_transactionId].locked = _locked;
    if (_locked) {
      emit TransactionLocked(_transactionId);
    } else {
      emit TransactionUnlocked(_transactionId);
    }
    return true;
  }

  /**
   * @dev cancel a transaction
   */
  function cancelTransaction(uint256 _transactionId)
    public virtual whenActive(_transactionId) returns (bool)
  {
    require(
      transactions[_transactionId].creator == msg.sender ||
      msg.sender == address(this),
      "PMS07"
    );

    transactions[_transactionId].cancelled = true;
    emit TransactionCancelled(_transactionId);
    return true;
  }

  /**
   * @dev approve a transaction
   */
  function approve(uint256 _transactionId)
    public virtual whenActive(_transactionId) returns (bool)
  {
    Transaction storage transaction = transactions[_transactionId];
    require(!transaction.confirmations[msg.sender], "PMS08");

    transaction.confirmed = transaction.confirmed + participants[msg.sender].weight;
    transaction.confirmations[msg.sender] = true;

    if (transaction.confirmed >= threshold_) {
      emit TransactionConfirmed(_transactionId);
    }
    return true;
  }

  /**
   * @dev revoke a transaction approval
   */
  function revokeApproval(uint256 _transactionId)
    public virtual whenActive(_transactionId) returns (bool)
  {
    require(_transactionId < transactionCount_, "PMS09");
    Transaction storage transaction = transactions[_transactionId];
    require(transaction.confirmations[msg.sender], "PMS10");

    transaction.confirmed = transaction.confirmed - participants[msg.sender].weight;
    transaction.confirmations[msg.sender] = false;

    if (transaction.confirmed < threshold_ &&
        transaction.confirmed + participants[msg.sender].weight >= threshold_)
    {
      emit TransactionUnconfirmed(_transactionId);
    }
    return true;
  }

  /**
   * @dev update many participants weight
   */
  function updateManyParticipants(address[] memory _participants, uint256[] memory _weights)
    public onlyOperator returns (bool)
  {
    for (uint256 i = 0; i < _participants.length; i++) {
      address participant = _participants[i];
      uint256 weight = _weights[i];

      uint256 previousWeight = participants[participant].weight;
      participants[participant].weight = weight;

      if (previousWeight == weight) {
        continue;
      }

      if (previousWeight == 0) {
        emit ParticipantAdded(participant, weight);
        participantCount_++;
      } else if (weight == 0) {
        emit ParticipantRemoved(participant);
        participantCount_--;
      } else {
        emit ParticipantUpdated(participant, weight);
      }
    }
    return true;
  }

  /**
   * @dev update configuration
   */
  function updateConfiguration(uint256 _newThreshold, uint256 _newDuration)
    public onlyOperator returns (bool)
  { 
    threshold_ = _newThreshold;
    duration_ = _newDuration;

    emit ConfigurationUpdated(threshold_, duration_);
    return true;
  }

  function currentTime() internal view returns (uint256) {
    // solhint-disable-next-line not-rely-on-time
    return block.timestamp;
  }

  event TransactionAdded(uint256 transactionId);
  event TransactionCancelled(uint256 transactionId);
  event TransactionLocked(uint256 transactionId);
  event TransactionUnlocked(uint256 transactionId);
  event TransactionConfirmed(uint256 transactionId);
  event TransactionUnconfirmed(uint256 transactionId);

  event Execution(uint256 indexed transactionId);
  event ExecutionFailure(uint256 indexed transactionId);
  event ParticipantAdded(address indexed participant, uint256 weight);
  event ParticipantUpdated(address indexed participant, uint256 weight);
  event ParticipantRemoved(address indexed participant);
  event ConfigurationUpdated(uint256 threshold, uint256 duration);
}
