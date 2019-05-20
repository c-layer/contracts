pragma solidity >=0.5.0 <0.6.0;

import "../interface/IProvableOwnership.sol";
import "./AuditableToken.sol";


/**
 * @title ProvableOwnershipToken
 * @dev ProvableOwnershipToken is an erc20 token
 * with ability to record a proof of ownership
 *
 * When desired a proof of ownership can be generated.
 * The proof is stored within the contract.
 * A proofId is then returned.
 * The proof can later be used to retrieve the amount needed.
 *
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 **/
contract ProvableOwnershipToken is IProvableOwnership, AuditableToken {
  struct Proof {
    uint256 amount;
    uint256 dateFrom;
    uint256 dateTo;
  }
  mapping(address => mapping(uint256 => Proof)) internal proofs;
  mapping(address => uint256) internal proofLengths;

  /**
   * @dev number of proof stored in the contract
   */
  function proofLength(address _holder) public view returns (uint256) {
    return proofLengths[_holder];
  }

  /**
   * @dev amount contains for the proofId reccord
   */
  function proofAmount(address _holder, uint256 _proofId)
    public view returns (uint256)
  {
    return proofs[_holder][_proofId].amount;
  }

  /**
   * @dev date from which the proof is valid
   */
  function proofDateFrom(address _holder, uint256 _proofId)
    public view returns (uint256)
  {
    return proofs[_holder][_proofId].dateFrom;
  }

  /**
   * @dev date until the proof is valid
   */
  function proofDateTo(address _holder, uint256 _proofId)
    public view returns (uint256)
  {
    return proofs[_holder][_proofId].dateTo;
  }

  /**
   * @dev called to challenge a proof at a point in the past
   * Return the amount tokens owned by the proof owner at that time
   */
  function checkProof(address _holder, uint256 _proofId, uint256 _at)
    public view returns (uint256)
  {
    if (_proofId < proofLengths[_holder]) {
      Proof storage proof = proofs[_holder][_proofId];

      if (proof.dateFrom <= _at && _at <= proof.dateTo) {
        return proof.amount;
      }
    }
    return 0;
  }

  /**
   * @dev called to create a proof of token ownership
   */
  function createProof(address _holder) public {
    createProofInternal(
      _holder,
      balanceOf(_holder),
      lastTransactionAt(_holder)
    );
  }

  /**
   * @dev transfer function with also create a proof of ownership to any of the participants
   * @param _proofSender if true a proof will be created for the sender
   * @param _proofReceiver if true a proof will be created for the receiver
   */
  function transferWithProofs(
    address _to,
    uint256 _value,
    bool _proofSender,
    bool _proofReceiver
  ) public returns (bool)
  {
    uint256 balanceBeforeFrom = balanceOf(msg.sender);
    uint256 beforeFrom = lastTransactionAt(msg.sender);
    uint256 balanceBeforeTo = balanceOf(_to);
    uint256 beforeTo = lastTransactionAt(_to);

    if (!super.transfer(_to, _value)) {
      return false;
    }

    transferPostProcessing(
      msg.sender,
      balanceBeforeFrom,
      beforeFrom,
      _proofSender
    );
    transferPostProcessing(
      _to,
      balanceBeforeTo,
      beforeTo,
      _proofReceiver
    );
    return true;
  }

  /**
   * @dev transfer function with also create a proof of ownership to any of the participants
   * @param _proofSender if true a proof will be created for the sender
   * @param _proofReceiver if true a proof will be created for the receiver
   */
  function transferFromWithProofs(
    address _from,
    address _to, 
    uint256 _value,
    bool _proofSender, bool _proofReceiver)
    public returns (bool)
  {
    uint256 balanceBeforeFrom = balanceOf(_from);
    uint256 beforeFrom = lastTransactionAt(_from);
    uint256 balanceBeforeTo = balanceOf(_to);
    uint256 beforeTo = lastTransactionAt(_to);

    if (!super.transferFrom(_from, _to, _value)) {
      return false;
    }

    transferPostProcessing(
      _from,
      balanceBeforeFrom,
      beforeFrom,
      _proofSender
    );
    transferPostProcessing(
      _to,
      balanceBeforeTo,
      beforeTo,
      _proofReceiver
    );
    return true;
  }

  /**
   * @dev can be used to force create a proof (with a fake amount potentially !)
   * Only usable by child contract internaly
   */
  function createProofInternal(
    address _holder, uint256 _amount, uint256 _from) internal
  {
    uint proofId = proofLengths[_holder];
    // solium-disable-next-line security/no-block-members
    proofs[_holder][proofId] = Proof(_amount, _from, currentTime());
    proofLengths[_holder] = proofId+1;
    emit ProofOfOwnership(_holder, proofId);
  }

  /**
   * @dev private function updating contract state after a transfer operation
   */
  function transferPostProcessing(
    address _holder,
    uint256 _balanceBefore,
    uint256 _before,
    bool _proof) private
  {
    if (_proof) {
      createProofInternal(_holder, _balanceBefore, _before);
    }
  }

  event ProofOfOwnership(address indexed holder, uint256 proofId);
}
