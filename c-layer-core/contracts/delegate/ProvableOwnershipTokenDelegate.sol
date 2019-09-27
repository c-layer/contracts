pragma solidity >=0.5.0 <0.6.0;

import "./AuditableTokenDelegate.sol";


/**
 * @title ProvableOwnershipTokenDelegate
 * @dev ProvableOwnershipToken is an erc20 token
 * with ability to record a proof of ownership
 *
 * When desired a proof of ownership can be generated.
 * The proof is stored within the contract.
 * A proofId is then returned.
 * The proof can later be used to retrieve the amount needed.
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 **/
contract ProvableOwnershipTokenDelegate is AuditableTokenDelegate {

  enum Field { AMOUNT, DATE_FROM, DATE_TO }

  /**
   * @dev transfer function with also create a proof of ownership to any of the participants
   * @param _proofSender if true a proof will be created for the sender
   * @param _proofReceiver if true a proof will be created for the receiver
   */
  function transferWithProofs(
    address _sender,
    address _to,
    uint256 _value,
    bool _proofSender,
    bool _proofReceiver
  ) public returns (bool)
  {
    if (super.transfer(_sender, _to, _value)) {
      return false;
    }

    TokenData storage token = tokens_[msg.sender];
    transferPostProcessing(
      _sender,
      token.balances[_sender],
      token.audits[0].addressData[_sender].lastTransactionAt,
      _proofSender
    );
    transferPostProcessing(
      _to,
      token.balances[_to],
      token.audits[0].addressData[_to].lastTransactionAt,
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
    address _sender,
    address _from,
    address _to, 
    uint256 _value,
    bool _proofSender, bool _proofReceiver)
    public returns (bool)
  {
    if (super.transferFrom(_sender, _from, _to, _value)) {
      return false;
    }

    TokenData storage token = tokens_[msg.sender];
    transferPostProcessing(
      _from,
      token.balances[_from],
      token.audits[0].addressData[_from].lastTransactionAt,
      _proofSender
    );
    transferPostProcessing(
      _to,
      token.balances[_to],
      token.audits[0].addressData[_to].lastTransactionAt,
      _proofReceiver
    );
    return true;
  }

  /**
   * @dev can be used to force create a proof (with a fake amount potentially !)
   * Only usable by child contract internaly
   */
  function createProof(
    address _token, address _holder, uint256 _amount, uint256 _from)
    public returns (bool)
  {
    uint256[3][] storage proofs = tokens_[_token].proofs[_holder];
    uint proofId = proofs.length;
    proofs.push([ _amount, _from, currentTime() ]);
    emit ProofCreated(_token, _holder, proofId);
    return true;
  }

  /**
   * @dev called to challenge a proof at a point in the past
   * Return the amount tokens owned by the proof owner at that time
   */
  function checkProof(address _token, address _holder, uint256 _proofId, uint256 _at)
    public view returns (uint256)
  {
    uint256[3][] storage proofs = tokens_[_token].proofs[_holder];
    if (_proofId < proofs.length) {
      uint256[3] storage proofChecked = proofs[_proofId];

      if (proofChecked[uint256(Field.DATE_FROM)] <= _at
        && _at <= proofChecked[uint256(Field.DATE_TO)])
      {
        return proofChecked[uint256(Field.AMOUNT)];
      }
    }
    return 0;
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
      createProof(msg.sender, _holder, _balanceBefore, _before);
    }
  }
}
