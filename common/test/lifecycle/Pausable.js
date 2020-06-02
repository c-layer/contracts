"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const Pausable = artifacts.require("Pausable.sol");

contract("Pausable", function (accounts) {
  let contract;

  beforeEach(async function () {
    contract = await Pausable.new();
  });

  it("should let operator pause", async function () {
    const tx = await contract.pause();
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Pause", "event");
  });

  it("should prevent pause by non operator", async function () {
    await assertRevert(contract.pause({ from: accounts[1] }), "OP01");
  });

  it("should prevent unpause when not paused", async function () {
    await assertRevert(contract.unpause(), "PA01");
  });

  describe("When paused", function () {

    beforeEach(async function () {
      await contract.pause();
    });

    it("should let operator unpause", async function () {
      const tx = await contract.unpause();
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Unpause", "event");
    });

    it("should prevent unpause by non operator", async function () {
      await assertRevert(contract.unpause({ from: accounts[1] }), "OP01");
    });

    it("should prevent pause when unpaused", async function () {
      await assertRevert(contract.pause(), "PA02");
    });
  });
});
