
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const MAX_TOLERANCE_FACTOR = 0.1;
const MAX_TOLERANCE_VALUE = 5000;

module.exports = async function (gasEstimatePromise, gasEstimateExpected, message) {
  const gasEstimate = await gasEstimatePromise;

  if (gasEstimate !== gasEstimateExpected) {
    const delta = Math.abs(gasEstimate - gasEstimateExpected);
    const success = delta < MAX_TOLERANCE_VALUE && delta < gasEstimate * MAX_TOLERANCE_FACTOR;

    if (!success) {
      assert.equal(gasEstimatePromise, gasEstimateExpected, message);
    } else {
      console.warn('Gas estimate is not accurate ' + gasEstimate +
        ', expected ' + gasEstimateExpected + ', for ' + message);
    }
  }
};
