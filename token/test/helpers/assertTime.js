
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const MAX_TOLERANCE_VALUE = 1; // in secondes

module.exports = function (actualTime, expectedTime, message) {
  if (actualTime !== expectedTime) {
    const delta = (actualTime > expectedTime)
      ? actualTime - expectedTime : expectedTime - actualTime;

    if (delta == 0) {
      return;
    }

    if (delta > MAX_TOLERANCE_VALUE) {
      assert.equal(actualTime, expectedTime, message);
    } else {
      console.warn('Time was not accurate ' + actualTime +
        ', expected ' + expectedTime + ', for ' + message);
    }
  }
};
