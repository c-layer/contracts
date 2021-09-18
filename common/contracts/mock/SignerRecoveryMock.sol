pragma solidity ^0.8.0;

import "../signer/SignerRecovery.sol";


/**
 * @title SignerRecoveryMock
 * @dev Mock to test SignerRecovery
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 **/
contract SignerRecoveryMock {
  using SignerRecovery for bytes;

  function testRecoverSigner(bytes memory _signature, uint64 _nonce, bytes memory _data)
    public view returns (address)
  {
    return _signature.recoverSigner(
      keccak256(abi.encode(address(this), msg.sender, _nonce, _data))
    );
  }

  function testRecoverSigner(bytes memory _signature, bytes32 _hash)
    public pure returns (address)
  {
    return _signature.recoverSigner(_hash);
  }
}
