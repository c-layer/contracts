
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

module.exports = async promise => {
  try {
    await promise;
    assert.fail('Expected out-of-bounds not received');
  } catch (error) {
    const invalidOpcodeReceived = error.message.search('out-of-bounds') >= 0;
    assert(invalidOpcodeReceived, `Expected 'out-of-bounds', got ${error} instead`);
  }
};
