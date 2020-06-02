
/**
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 *
 * Copyright © 2016 - 2019 Cyril Lapinte - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Cyril Lapinte.
 * Written by *Cyril Lapinte*, <cyril.lapinte@gmail.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

module.exports = async function (promise) {
  try {
    await promise;
    assert.fail('Expected revert not received');
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }
};
