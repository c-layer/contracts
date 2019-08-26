pragma solidity >=0.5.0 <0.6.0;

import "../storage/ProvableOwnershipTokenStorage.sol";
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
contract ProvableOwnershipTokenDelegate is AuditableTokenDelegate, ProvableOwnershipTokenStorage {

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
    address token = msg.sender;
    uint256 balanceBeforeFrom = balanceOf(_sender);
    uint256 beforeFrom = lastTransactionAt(token, _sender);
    uint256 balanceBeforeTo = balanceOf(_to);
    uint256 beforeTo = lastTransactionAt(token, _to);

    if (!super.transfer(_sender, _to, _value)) {
      return false;
    }

    transferPostProcessing(
      _sender,
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
    address _sender,
    address _from,
    address _to, 
    uint256 _value,
    bool _proofSender, bool _proofReceiver)
    public returns (bool)
  {
    address token = msg.sender;
    uint256 balanceBeforeFrom = balanceOf(_from);
    uint256 beforeFrom = lastTransactionAt(token, _from);
    uint256 balanceBeforeTo = balanceOf(_to);
    uint256 beforeTo = lastTransactionAt(token, _to);

    if (!super.transferFrom(_sender, _from, _to, _value)) {
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
   * @dev private function updating contract state after a transfer operation
   */
  function transferPostProcessing(
    address _holder,
    uint256 _balanceBefore,
    uint256 _before,
    bool _proof) private
  {
    if (_proof) {
      createProofInternal(msg.sender, _holder, _balanceBefore, _before);
    }
  }
}
