
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
const abi = web3.eth.abi;

module.exports = {
  buildHash: async function (destination, value, data, validity) {
    if (!this.web3 && web3) {
      this.web3 = web3;
    }
    const replayProtection = await this.multiSig.replayProtection();
    return this.buildHashWithReplay(destination, value, data, validity, replayProtection);
  },
  buildHashWithReplay: async function (destination, value, data, validity, replayProtection) {
    let encodedParams = 0;
    if (data === '0x') {
      encodedParams = abi.encodeParameters(
        ['address', 'uint256', 'uint256', 'bytes32'],
        [destination,
          this.web3.utils.toHex(value),
          this.web3.utils.toHex(validity),
          replayProtection,
        ],
      );
    } else {
      encodedParams = abi.encodeParameters(
        ['address', 'uint256', 'bytes', 'uint256', 'bytes32'],
        [destination,
          this.web3.utils.toHex(value),
          data,
          this.web3.utils.toHex(validity),
          replayProtection,
        ],
      );
    }
    const hash = this.web3.utils.sha3(encodedParams, { encoding: 'hex' });
    return hash;
  },
  sign: async function (destination, value, data, validity, address) {
    const hash = await this.buildHash(destination, value, data, validity);
    const signedHash = await this.web3.eth.sign(hash, address);

    return {
      r: signedHash.slice(0, 66),
      s: '0x' + signedHash.slice(66, 130),
      v: this.web3.utils.toDecimal('0x' + signedHash.slice(130, 132)),
    };
  },
};
