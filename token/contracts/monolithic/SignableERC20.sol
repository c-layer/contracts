pragma solidity ^0.8.0;

import "@c-layer/common/contracts/token/TokenERC20.sol";
import "@c-layer/common/contracts/operable/Operable.sol";
import "@c-layer/common/contracts/signer/SignerRecovery.sol";
import "../interface/ISignableERC20.sol";


/**
 * @title Signable Token ERC20
 * @dev Signable Token ERC20 default implementation
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error messages
 *   ST01: Signature is outdated
 */
contract SignableTokenERC20 is ISignableERC20, Operable, TokenERC20 {
  using SignerRecovery for bytes;

  mapping(address => mapping(address => uint256)) private transferred;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _decimals,
    address _initialAccount,
    uint256 _initialSupply
  ) TokenERC20(
    _name,
    _symbol,
    _decimals,
    _initialAccount,
    _initialSupply)
  {
  }

  /**
   * @dev transferFromWithSignature
   */
   function transferFromWithSignature(
    address _from,
    address _to,
    uint256 _value,
    uint64 _signatureValidity,
    bytes memory _signature) public override returns (bool)
  {
    // solhint-disable-next-line
    require(_signatureValidity >= block.timestamp, "ST01");

    transferred[_from][msg.sender] += _value;
    bytes32 hash = keccak256(abi.encode(
      address(this), _from, msg.sender, transferred[_from][msg.sender], _signatureValidity)
    );

    address signer = _signature.recoverSigner(hash);
    emit Signature(signer, msg.sender, hash);

    if (isOperator(signer) && _from == address(0)) {
      return mintInternal(_to, _value);
    } else {
      require(_to != address(0), "TE01");
      require(_value <= balances[_from], "TE02");

      if (_from != signer) {
        require(_value <= allowed[_from][signer], "TE03");
        allowed[_from][signer] = allowed[_from][signer] - _value;
        emit Approval(_from, signer, allowed[_from][signer]);
      }

      balances[_from] = balances[_from] - _value;
      balances[_to] = balances[_to] + _value;
      emit Transfer(_from, _to, _value);
      return true;
    }
  }

  /**
   * @dev Function to mint tokens internal
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mintInternal(address _to, uint256 _amount) internal returns (bool)
  {
    totalSupply_ = totalSupply_ + _amount;
    balances[_to] = balances[_to] + _amount;
    emit Transfer(address(0), _to, _amount);
    return true;
  }
}
