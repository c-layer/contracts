"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../../helpers/assertRevert");
const ProcessSig = artifacts.require("../contracts/multisig/private/ProcessSig.sol");

contract("ProcessSig", function (accounts) {
  let processSig;

  beforeEach(async function () {
    processSig = await ProcessSig.new([ accounts[1] ], 1);
  });

  it("should not accept any ETH", async function () {
    await assertRevert(
      new Promise((resolve, reject) => web3.eth.sendTransaction({
        from: accounts[0],
        to: processSig.address,
        value: web3.utils.toWei("1", "milli"),
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }))
    );
  });
});
