pragma solidity ^0.8.0;


/**
 * @title SignerRecovery
 * @dev Recover the address associated with a signed message
 *
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 * SPDX-License-Identifier: MIT
 *
 * Error Messages:
 **/
library SignerRecovery {

  // web3.eth.sign prepend the string below to sign messages
  string constant private ETHEREUM_SIGN_MESSAGE_PREFIX = "\x19Ethereum Signed Message:\n32";

  /**
   * @dev recoverSigner
   */ 
  function recoverSigner(bytes memory _signature, bytes32 _hash)
    internal pure returns (address)
  {
    bytes32 signatureHash = keccak256(
      abi.encodePacked(ETHEREUM_SIGN_MESSAGE_PREFIX, _hash)
    );

    bytes32 r;
    bytes32 s;
    uint8 v;

    // Extract r, s and v
    // solhint-disable-next-line no-inline-assembly
    assembly {
      r := mload(add(_signature, 0x20))
      s := mload(add(_signature, 0x40))
      v := byte(0, mload(add(_signature, 0x60)))
    }

    // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
    v = (v < 27) ? v += 27 : v;

    // If the version is correct return the signer address
    if (v != 27 && v != 28) {
      return address(0);
    } else {
      return ecrecover(
        signatureHash,
        v,
        r,
        s
      );
    }
  }
}
