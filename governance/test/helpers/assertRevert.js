
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

module.exports = async function (promise, expectedReasonOrCode) {
  let success = false;
  try {
    await promise;
    success = true;
  } catch (error) {
    if (typeof error == 'object') {
      if (Object.keys(error).length > 1) {
        const revertReasonFound =
          (error.reason && error.reason === expectedReasonOrCode) ||
          (error.reason && error.reason.indexOf(expectedReasonOrCode) !== -1) ||
            (error.code && error.code === expectedReasonOrCode);

        if (!revertReasonFound || !expectedReasonOrCode) {
          console.error(JSON.stringify(error));
        }
        assert(revertReasonFound,
          'Expected "revert", got reason=' + error.reason + ' and code=' + error.code + ' instead!');
      } else {
        const errorStr = error.toString();

        if (expectedReasonOrCode) {
          const revertAt = errorStr.indexOf('revert ');
          const revertStr = errorStr.substr(revertAt);
          const revertReasonFound = revertStr.indexOf(expectedReasonOrCode) !== -1;
          assert(revertReasonFound, 'Expected "revert ' + expectedReasonOrCode + '", got "' + revertStr + '"!');
        } /*else {
          const errorAt = errorStr.indexOf('VM Exception while processing transaction: revert');
          assert(errorAt !== -1, errorStr);
        }*/
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
