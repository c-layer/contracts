
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

/* eslint-disable-next-line no-control-regex */
const REGEXP_CONTROL_CHARACTER_FILTER = /\u0000/g;

module.exports = async function (promise, expectedReasonOrCode) {
  let success = false;
  try {
    await promise;
    success = true;
  } catch (error) {
    if (typeof error == 'object') {
      if (Object.keys(error).length > 1) {
        let revertReasonFound =
          (error.reason && error.reason === expectedReasonOrCode) ||
            (error.code && error.code === expectedReasonOrCode);

        if (!revertReasonFound && expectedReasonOrCode) {
          revertReasonFound = error.reason.replace(REGEXP_CONTROL_CHARACTER_FILTER, '').endsWith(expectedReasonOrCode);
        }

        if (!revertReasonFound || !expectedReasonOrCode) {
          console.error(JSON.stringify(error));
        }
        assert(revertReasonFound,
          'Expected "revert", got reason=' + error.reason + ' and code=' + error.code + ' instead!');
      } else {
        const errorStr = error.toString();
        const revertReasonFound = errorStr.indexOf('revert ' + expectedReasonOrCode);
        assert(revertReasonFound, 'Expected "revert ' + expectedReasonOrCode + '", got "' + errorStr + '"!');
      }
    } else {
      assert(false, 'Invalid error format. Revert not found "' + error + '"!');
    }
  } finally {
    if (success) {
      assert.fail('Expected revert not received');
    }
  }
};
