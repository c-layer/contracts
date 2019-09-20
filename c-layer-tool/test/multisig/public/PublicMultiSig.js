"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertJump = require("../../helpers/assertJump");
const assertRevert = require("../../helpers/assertRevert");
const PublicMultiSig = artifacts.require("../../contracts/multisig/public/PublicMultiSig.sol");

contract("PublicMultiSig", function (accounts) {
  const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
  let multiSig;
  let request;
 
  beforeEach(async function () {
    multiSig = await PublicMultiSig.new(100, 3600 * 24, [ accounts[0] ], [ 100 ]);
    request = {
      "params": [{
        "to": multiSig.address,
        "data": multiSig.contract.methods.updateConfiguration(50, 3600 * 24 * 7).encodeABI(),
      }],
    };
  });

  async function suggest () {
    const txReceipt = await multiSig.suggest(request.params[0].to, 0, request.params[0].data);
    assert.equal(txReceipt.logs.length, 1);
    assert.equal(txReceipt.logs[0].event, "TransactionAdded");
    const txId = (txReceipt.logs[0].args.transactionId).toNumber();
    assert.equal((await multiSig.transactionCount()).toNumber(), txId + 1, "transactionCount");
    assert.equal(await multiSig.isConfirmed(txId), false, "isConfirmed");
    assert.equal(await multiSig.hasParticipated(txId, accounts[0]), false, "hasParticipated");
    assert.equal(await multiSig.isLocked(txId), false, "isLocked");
    assert.equal(await multiSig.isExpired(txId), false, "isExpired");
    assert.equal(await multiSig.isCancelled(txId), false, "isCancelled");
    assert.equal(await multiSig.transactionCreator(txId), accounts[0], "transactionCreator");
    assert.ok((await multiSig.transactionCreatedAt(txId)) < (new Date().getTime()) / 1000, "transactionCreatedAt");
    assert.equal(await multiSig.isExecuted(txId), false, "isExecuted");
    return txId;
  };

  async function approveToConfirm (txId) {
    const confirmationReceipt = await multiSig.approve(txId);
    assert.equal(confirmationReceipt.logs.length, 1);
    assert.equal(confirmationReceipt.logs[0].event, "TransactionConfirmed");
    assert.equal(confirmationReceipt.logs[0].args.transactionId, txId);
    assert.equal(await multiSig.isConfirmed(txId), true, "isConfirmed");
    assert.equal(await multiSig.hasParticipated(txId, accounts[0]), true, "hasParticipated");
    assert.equal(await multiSig.isExecuted(txId), false, "isExecuted");
  }

  async function execute (txId) {
    const isExecutable = await multiSig.isExecutable(txId);
    assert.equal(isExecutable, true, "isExecutable");
    const executionReceipt = await multiSig.execute(txId);
    assert.equal(executionReceipt.logs.length, 2);
    assert.equal(executionReceipt.logs[0].event, "ConfigurationUpdated");
    assert.equal(executionReceipt.logs[0].args.threshold, 50);
    assert.equal(executionReceipt.logs[0].args.duration.toNumber(), 3600 * 24 * 7);
    assert.equal(executionReceipt.logs[1].event, "Execution");
    assert.equal(executionReceipt.logs[1].args.transactionId, 0);
    assert.equal(await multiSig.threshold(), 50, "Threshold");
    assert.equal((await multiSig.duration()).toNumber(), 3600 * 24 * 7, "Duration");
    assert.equal(await multiSig.isExecuted(txId), true, "isExecuted");
  }

  describe("after initialization", function () {
    it("should have itself as a owner", async function () {
      const owner = await multiSig.owner();
      assert.equal(owner, multiSig.address, "Owner");
    });

    it("should have default threshold and duration", async function () {
      const threshold = await multiSig.threshold();
      assert.equal(threshold, 100, "Threshold");

      const duration = await multiSig.duration();
      assert.equal(duration, 3600 * 24, "Duration");
    });

    it("should have by default 1 participant", async function () {
      const participantCount = await multiSig.participantCount();
      assert.equal(participantCount, 1, "participantCount");

      const participantWeight = await multiSig.participantWeight(accounts[0]);
      assert.equal(participantWeight, 100, "participantWeight");
    });

    it("should have by default 0 transactions", async function () {
      const transactionCount = await multiSig.transactionCount();
      assert.equal(transactionCount.toNumber(), 0, "transactionCount");
    });

    it("should return not confirmed on non existing transaction", async function () {
      try {
        await multiSig.isConfirmed(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should return not participated on non existing transaction", async function () {
      const hasParticipated = await multiSig.hasParticipated(0, NULL_ADDRESS);
      assert.equal(hasParticipated, false, "hasParticipated");
      const participantHasParticipated = await multiSig.hasParticipated(0, accounts[0]);
      assert.equal(participantHasParticipated, false, "existing participant hasParticipated");
    });

    it("should return not locked on non existing transaction", async function () {
      try {
        await multiSig.isLocked(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should return not expired on non existing transaction", async function () {
      try {
        await multiSig.isExpired(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should return not cancelled on non existing transaction", async function () {
      try {
        await multiSig.isCancelled(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should return transactionCreator empty on non existing transaction", async function () {
      try {
        await multiSig.transactionCreator(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should return not executed on non existing transaction", async function () {
      try {
        await multiSig.isExecuted(0);
        assert.fail("should have thrown before");
      } catch (error) {
        assertJump(error);
      }
    });

    it("should not allow to execute to be reentrant", async function () {
      const request = {
        "params": [{
          "to": multiSig.address,
          "data": multiSig.contract.methods.execute(0).encodeABI(),
        }],
      };
      await multiSig.suggest(request.params[0].to, 0, request.params[0].data);
      await multiSig.approve(0);
      const tx = await multiSig.execute(0);
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ExecutionFailure");
      assert.equal(tx.logs[0].args.transactionId, 0);
      assert.equal(await multiSig.isExecuted(0), false, "isExecuted");
    });
  });

  describe("with a default participant and a transaction (UpdateConfiguration) created", function () {
    beforeEach(async function () {
      await suggest();
    });
  
    it("should have one transaction", async function () {
      assert.equal((await multiSig.transactionCount()).toNumber(), 1, "transactionCount");
    });

    it("should have a transaction destination defined", async function () {
      const destination = await multiSig.transactionDestination(0);
      assert.equal(destination, request.params[0].to, "destination");
    });

    it("should have a transaction value defined", async function () {
      const value = await multiSig.transactionValue(0);
      assert.equal(value, 0, "value");
    });

    it("should have a transaction data defined", async function () {
      const data = await multiSig.transactionData(0);
      assert.equal(data, request.params[0].data, "data");
    });

    it("should revert when approved a second time", async function () {
      await approveToConfirm(0);
      await assertRevert(multiSig.approve(0), "PMS08");
    });

    it("should revert when executed without confirmation", async function () {
      await assertRevert(multiSig.execute(0), "PMS05");
    });

    it("should revert when revoked but not confirmed", async function () {
      await assertRevert(multiSig.revokeApproval(0), "PMS10");
    });

    it("should not be executable if revoked", async function () {
      await approveToConfirm(0);
      const revokeReceipt = await multiSig.revokeApproval(0);
      assert.equal(revokeReceipt.logs.length, 1);
      assert.equal(revokeReceipt.logs[0].event, "TransactionUnconfirmed");
      assert.equal(revokeReceipt.logs[0].args.transactionId, 0);
      assert.equal(await multiSig.isConfirmed(0), false, "!isConfirmed");
      assert.equal(await multiSig.hasParticipated(0, accounts[0]), false, "hasParticipated");
      
      await assertRevert(multiSig.execute(0), "PMS05");
      await approveToConfirm(0);
      await execute(0);
    });

    it("should not be executable if locked", async function () {
      await approveToConfirm(0);
      const lockedReceipt = await multiSig.lockTransaction(0, true);
      assert.equal(lockedReceipt.logs.length, 1);
      assert.equal(lockedReceipt.logs[0].event, "TransactionLocked");
      assert.equal(lockedReceipt.logs[0].args.transactionId, 0);
      assert.equal(await multiSig.isLocked(0), true, "isLocked");
   
      await assertRevert(multiSig.execute(0), "PMS04");
      assert.equal(await multiSig.isExecuted(0), false, "isExecuted");

      const unlockReceipt = await multiSig.lockTransaction(0, false);
      assert.equal(unlockReceipt.logs.length, 1);
      assert.equal(unlockReceipt.logs[0].event, "TransactionUnlocked");
      assert.equal(unlockReceipt.logs[0].args.transactionId, 0);
      assert.equal(await multiSig.isLocked(0), false, "isLocked");
       
      await execute(0);
    });

    it("should only be locked by its creator", async function () {
      await assertRevert(
        multiSig.lockTransaction(0, true, { from: accounts[1] }),
        "PMS06");
      assert.equal(await multiSig.isExecuted(0), false, "isExecuted");
    });

    it("should not be executable if cancelled", async function () {
      await approveToConfirm(0);
      const cancelledReceipt = await multiSig.cancelTransaction(0);
      assert.equal(await multiSig.isCancelled(0), true, "isCancelled");
      assert.equal(cancelledReceipt.logs.length, 1);
      assert.equal(cancelledReceipt.logs[0].event, "TransactionCancelled");
      assert.equal(cancelledReceipt.logs[0].args.transactionId, 0);
  
      await assertRevert(multiSig.execute(0), "PMS02");
      assert.equal(await multiSig.isExecuted(0), false, "isExecuted");
    });

    it("should only be cancelled by its creator", async function () {
      await assertRevert(
        multiSig.cancelTransaction(0, { from: accounts[1] }),
        "PMS07");
    });

    it("should update default threshold and duration", async function () {
      await approveToConfirm(0);
      await execute(0);
    });
  });

  describe("PublicMultiSig (2-of-3)", function () {
    beforeEach(async function () {
      multiSig = await PublicMultiSig.new(100, 3600 * 24,
        [ accounts[0], accounts[1], accounts[2] ], [ 50, 50, 50 ]);
      await suggest();
    });

    it("should not be confirmed with unsufficient weight", async function () {
      await multiSig.approve(0);
      const isConfirmed = await multiSig.isConfirmed(0);
      assert.equal(isConfirmed, false, "isConfirmed");
    });
  });

  describe("with an expired pending transaction", function () {
    const delay = 1;

    async function waitDelay () {
      await new Promise(resolve => setTimeout(resolve, (delay + 1) * 1000));
    }

    before(async function () {
      multiSig = await PublicMultiSig.new(100, delay, [ accounts[0] ], [ 100 ]);
      await suggest();
      await waitDelay();
    });

    it("should be expired", async function () {
      const isExpired = await multiSig.isExpired(0);
      assert.equal(isExpired, true, "isExpired");
    });

    it("should not be approved if expired", async function () {
      await assertRevert(multiSig.approve(0), "PMS01");
      assert.equal(await multiSig.isConfirmed(0), false, "isConfirmed");
    });

    it("should not be executable if expired", async function () {
      await assertRevert(multiSig.execute(0), "PMS01");
      assert.equal(await multiSig.isExecuted(0), false, "isExecuted");
    });
  });
  
  describe("(eth transfer)", function () {
    beforeEach(async function () {
      multiSig = await PublicMultiSig.new(100, 3600 * 24, [ accounts[0] ], [ 100 ]);
    });

    it("should have itself as a owner", async function () {
      const owner = await multiSig.owner();
      assert.equal(owner, multiSig.address, "Owner");
    });
  });
});
