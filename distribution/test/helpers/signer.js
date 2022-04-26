
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */
const abi = web3.eth.abi;

const Types = {
  ADDRESS: 'address',
  UINT256: 'uint256',
  BYTES: 'bytes',
  BYTES32: 'bytes32',
};

module.exports = {
  // Usualy solidity types
  Types,
  buildHash: async function (types, values) {
    const parsedTypes = [];
    const parsedValues = [];

    if (types.length !== values.length) {
      throw new Error('Mismatch between types and values');
    }

    for (let i = 0; i < types.length; i++) {
      if (types[i] === Types.BYTES && values[i] === '0x') {
        continue;
      }
      parsedTypes[i] = types[i];
      parsedValues[i] = values[i];
    }

    const encodedParams = abi.encodeParameters(parsedTypes, parsedValues);
    const hash = web3.utils.sha3(encodedParams, { encoding: 'hex' });
    return hash;
  },
  sign: async function (types, values, address) {
    const hash = await this.buildHash(types, values);
    return await web3.eth.sign(hash, address);
  },
};
