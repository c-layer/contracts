"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */

const assertRevert = require("./helpers/assertRevert");
const BN = require('bn.js');
const StateMachineMock = artifacts.require("../contracts/mock/StateMachineMock.sol");

const MAX_UINT256 = new BN("2").pow(new BN("256")).sub(new BN("1"));

contract("StateMachine", function (accounts) {
  let machine;
  let now = Math.floor(new Date().getTime() / 1000);

  beforeEach(async function () {
    machine = await StateMachineMock.new();
  });

  it("should have 0 steps", async function () {
    const stepsCount = await machine.stepsCount();
    assert.equal(stepsCount, 0, "0 steps");
  });

  it("current steps should fail", async function () {
    await assertRevert(machine.currentStep(), "SMXX");
  });

  it("should not permit to go nextStep", async function () {
    await assertRevert(machine.nextStepPublic(), "SM01");
  });

  it("should be possible to add a step", async function () {
    const tx = await machine.addStepPublic(0, 0);
    assert.ok(tx.receipt.status, "status");
  });

  it("should be possible to add an historical step", async function () {
    const tx = await machine.addHistoricalStepPublic(now - 7200, 0, 0);
    assert.ok(tx.receipt.status, "status");
  });

  it("should not be possible to add an historical step in the future", async function () {
    await assertRevert(machine.addHistoricalStepPublic(now + 2000, 0, 0), "SM02");
  });

  it("should not be possible to add an historical step " +
    "with stepTime older than previous step", async function () {
    await machine.addStepPublic(0, 0);
    await assertRevert(machine.addHistoricalStepPublic(now - 7200, 0, 0), "SM03");
  });

  it("should not be possible to update current end time", async function () {
    await assertRevert(machine.updateCurrentStepPublic(1, 0), "SM01");
  });

  it("should not be possible to update current delay", async function () {
    await assertRevert(machine.updateCurrentStepPublic(0, 1), "SM01");
  });

  describe("with 2 steps and no planned transitions", async function () {
    beforeEach(async function () {
      await machine.addStepPublic(0, 0);
      await machine.addStepPublic(0, 0);
    });

    it("should have 2 steps", async function () {
      const stepsCount = await machine.stepsCount();
      assert.equal(stepsCount, 2, "2 steps");
    });

    it("should have a current step", async function () {
      const currentStep = await machine.currentStep();
      assert.equal(currentStep, 0, "current step");
    });

    it("should have 0 transition end time for steps 1", async function () {
      const transitionEndTime = await machine.transitionEndTime(1);
      assert.equal(transitionEndTime, 0, "transitionEndTime");
    });

    it("should have 0 transition delay for steps 2", async function () {
      const transitionDelay = await machine.transitionDelay(1);
      assert.equal(transitionDelay, 0, "transitionDelay");
    });

    it("should have a step end time at infinity", async function () {
      const startTime = await machine.stepTime(0);
      const stepEndTime = await machine.stepEndTime(0, startTime);
      assert.equal(stepEndTime.toString(), MAX_UINT256.toString(), "stepEndTime");
    });

    it("should have a step time for step 0", async function () {
      const stepTime = await machine.stepTime(0);
      assert.ok(stepTime > now, "step time");
    });

    it("should not have a step time for step 1", async function () {
      const stepTime = await machine.stepTime(1);
      assert.equal(stepTime, 0, "step time");
    });

    it("should not be possible to update current end time", async function () {
      await assertRevert(machine.updateCurrentStepPublic(1, 0), "SM04");
    });

    it("should not be possible to update current delay", async function () {
      await assertRevert(machine.updateCurrentStepPublic(0, 1), "SM04");
    });

    it("should go to next step", async function () {
      const tx = await machine.nextStepPublic();
      assert.ok(tx.receipt.status, "status");
    });

    describe("and one step forward", function () {
      beforeEach(async function () {
        await machine.nextStepPublic();
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 1, "current step");
      });

      it("should have a step end time at infinity", async function () {
        const startTime = await machine.stepTime(1);
        const stepEndTime = await machine.stepEndTime(1, startTime);
        assert.equal(stepEndTime.toString(), MAX_UINT256.toString(), "stepEndTime");
      });

      it("should not go to next step", async function () {
        await assertRevert(machine.nextStepPublic(), "SM06");
      });

      it("should have a step time for step 1 greater or equal than step 0", async function () {
        const stepTime0 = await machine.stepTime(0);
        const stepTime1 = await machine.stepTime(1);
        assert.ok(stepTime1 >= stepTime0, "step time");
      });
    });
  });

  describe("with 2 steps and a planned transition on end time", function () {
    describe("in the future", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now + 3600, 0);
        await machine.addStepPublic(0, 0);
      });

      it("should have step 0 end time at now + 3600", async function () {
        const stepEndTime = await machine.stepEndTime(0, 0);
        assert.equal(stepEndTime.toString(), Math.floor(now + 3600) + '', "stepEndTime");
      });

      it("should have step 1 end time at infinity", async function () {
        const stepEndTime = await machine.stepEndTime(1, now + 3600);
        assert.equal(stepEndTime.toString(), MAX_UINT256.toString(), "stepEndTime");
      });

      it("should be possible to update current step end time", async function () {
        const tx = await machine.updateCurrentStepPublic(now + 1200, 0);
        assert.ok(tx.receipt.status, "status");

        const startTime = await machine.stepTime(0);
        const stepEndTime = await machine.stepEndTime(0, startTime);
        assert.equal(stepEndTime.toString(), Math.floor(now + 1200) + '', "stepEndTime");
      });

      it("should not be possible to update current step end time in the past", async function () {
        await assertRevert(machine.updateCurrentStepPublic(now - 1200, 0), "SM05");
      });

      it("should not be possible to update current step delay", async function () {
        await assertRevert(machine.updateCurrentStepPublic(0, 100), "SM04");
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 0, "current step");
      });

      it("should not allow to go step 1 manually", async function () {
        await assertRevert(machine.nextStepPublic(), "SM07");
      });
    });

    describe("in the past", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now - 3600, 0);
        await machine.addStepPublic(0, 0);
      });

      it("should not be possible to update current step end time", async function () {
        await assertRevert(machine.updateCurrentStepPublic(now + 1200, 0), "SM04");
      });

      it("should not be possible to update current step delay", async function () {
        await assertRevert(machine.updateCurrentStepPublic(0, 100), "SM04");
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 1, "current step");
      });

      it("should have no step time for step 1", async function () {
        const stepTime = await machine.stepTime(1);
        assert.equal(stepTime, 0, "current step");
      });
    });

    describe("in the past for the second step", function () {
      beforeEach(async function () {
        await machine.addStepPublic(0, 0);
        await machine.addStepPublic(now - 3600, 0);
      });

      it("should not be possible to update current step end time", async function () {
        await assertRevert(machine.updateCurrentStepPublic(now + 1200, 0), "SM04");
      });

      it("should not be possible to update current step delay", async function () {
        await assertRevert(machine.updateCurrentStepPublic(0, 100), "SM04");
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep.toNumber(), 0, "current step");
      });
    });
  });

  describe("with 2 steps and a planned transition on delay", function () {
    describe("in the future", function () {
      beforeEach(async function () {
        await machine.addStepPublic(0, 3600);
        await machine.addStepPublic(0, 0);
      });

      it("should have step 0 end time at +3600", async function () {
        const startTime = await machine.stepTime(0);
        const stepEndTime = await machine.stepEndTime(0, startTime);
        assert.equal(stepEndTime.toString(), startTime.add(new BN("3600")).toString(), "stepEndTime");
      });

      it("should have step 1 end time at infinity", async function () {
        const startTime = await machine.stepTime(0);
        const stepEndTime = await machine.stepEndTime(1, startTime + 3600);
        assert.equal(stepEndTime.toString(), MAX_UINT256.toString(), "stepEndTime");
      });

      it("should not be possible to update current step end time", async function () {
        await assertRevert(machine.updateCurrentStepPublic(now + 1200, 0), "SM04");
      });

      it("should be possible to update current step delay", async function () {
        const tx = await machine.updateCurrentStepPublic(0, 1000);
        assert.ok(tx.receipt.status, "status");
        
        const startTime = await machine.stepTime(0);
        const stepEndTime = await machine.stepEndTime(0, startTime);
        assert.equal(stepEndTime.toString(), startTime.add(new BN("1000")).toString(), "stepEndTime");
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 0, "current step");
      });

      it("should not allow to go step 1 manually", async function () {
        await assertRevert(machine.nextStepPublic(), "SM07");
      });
    });

    describe("in the past", function () {
      beforeEach(async function () {
        await machine.addHistoricalStepPublic(now - 7200, 0, 3600);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 1, "current step");
      });

      it("should have no step time for step 1", async function () {
        const stepTime = await machine.stepTime(1);
        assert.equal(stepTime, 0, "current step");
      });
    });

    describe("in the past for the second step", function () {
      beforeEach(async function () {
        await machine.addHistoricalStepPublic(now - 10000, 0, 0);
        await machine.addHistoricalStepPublic(now - 7200, 0, 3600);
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep.toNumber(), 0, "current step");
      });
    });
  });

  describe("with 2 steps and two planned transitions both end time and delay", function () {
    describe("with both in the future", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now + 3600, 3600);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 0, "current step");
      });
    });

    describe("with delay in the future", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now - 1200, 3600);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 1, "current step");
      });
    });

    describe("with delay in the past", function () {
      beforeEach(async function () {
        await machine.addHistoricalStepPublic(now - 2000, now + 3600, 1200);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 1, "current step");
      });
    });
  });

  describe("with 3 steps endTime transition followed by delay transition", function () {
    describe("at step 0", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now + 500, 0);
        await machine.addStepPublic(0, 1000);
        await machine.addStepPublic(0, 0);
      });

      it("should have step 0 at now+500", async function () {
        const stepEndTime = await machine.stepEndTime(0, 0);
        assert.equal(stepEndTime.toString(), (now + 500) + '', "stepEndTime");
      });

      it("should have step 1 end time at now + 1500", async function () {
        const stepEndTime = await machine.stepEndTime(1, now + 500);
        assert.equal(stepEndTime.toString(), (now + 1500) + '', "stepEndTime");
      });

      it("should have step 2 end time at infinity", async function () {
        const stepEndTime = await machine.stepEndTime(2, now + 1500);
        assert.equal(stepEndTime.toString(), MAX_UINT256.toString(), "stepEndTime");
      });

      it("should have current step to 0", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep, 0, "current step");
      });
    });

    describe("at step 1", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now - 500, 0);
        await machine.addStepPublic(0, 1000);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 1", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep.toNumber(), 1, "current step");
      });
    });

    describe("at step 2", function () {
      beforeEach(async function () {
        await machine.addStepPublic(now - 1500, 0);
        await machine.addStepPublic(0, 1000);
        await machine.addStepPublic(0, 0);
      });

      it("should have current step to 2", async function () {
        const currentStep = await machine.currentStep();
        assert.equal(currentStep.toNumber(), 2, "current step");
      });
    });
  });

  describe("with 5 steps and all planned transitions on end time", function () {
    beforeEach(async function () {
      await machine.addStepPublic(now - 10000, 0);
      await machine.addStepPublic(now - 9000, 0);
      await machine.addStepPublic(now - 8000, 0);
      await machine.addStepPublic(now - 7000, 0);
      await machine.addStepPublic(now - 6000, 0);
    });

    it("should have current step to 4", async function () {
      const currentStep = await machine.currentStep();
      assert.equal(currentStep, 4, "current step");
    });
  });
});
