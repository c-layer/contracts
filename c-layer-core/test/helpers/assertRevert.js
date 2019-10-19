
/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

module.exports = async function (promise, expectedReasonOrCode) {
  let success = false;
  try {
    await promise;
    success = true;
  } catch (error) {
    if (typeof error == "object") {
      if (Object.keys(error).length > 1) {
        const revertReasonFound =
          (error.reason && error.reason === expectedReasonOrCode) ||
            (error.code && error.code === expectedReasonOrCode);

        if (!revertReasonFound || !expectedReasonOrCode) {
          console.error(JSON.stringify(error));
        }
        assert(revertReasonFound,
          "Expected 'revert', got reason=" + error.reason + " and code=" + error.code + " instead!");
      } else {
        const errorStr = error.toString();
        const revertReasonFound = errorStr.indexOf("revert " + expectedReasonOrCode);
        assert(revertReasonFound, "Expected 'revert " + expectedReasonOrCode + "', got '" + errorStr + "'!");
      }
    } else {
      assert(false, "Invalid error format. Revert not found '" + error + "'!");
    }
  } finally {
    if (success) {
      assert.fail("Expected revert not received");
    }
  }
};
