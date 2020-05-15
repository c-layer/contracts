"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const WithClaimsTokenDelegate = artifacts.require("WithClaimsTokenDelegate.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const NULL_ADDRESS = "0x".padEnd(42, "0");
const AUDIT_ALWAYS = 3;
const AUDIT_STORAGE_ADDRESS = 0;
const CLAIM_BEFORE = "" + Math.floor((new Date().getTime() - 3600 * 24 * 365) / 1000);
const CLAIM_AFTER = "" + Math.floor((new Date().getTime() + 3600 * 24 * 365) / 1000);

contract("WithClaimsTokenDelegate", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await WithClaimsTokenDelegate.new();
    core = await TokenCore.new("Test");
    await core.defineAuditConfiguration(0,
      0, false,
      AUDIT_ALWAYS, AUDIT_STORAGE_ADDRESS,
      [], NULL_ADDRESS, "0x0",
      [false, true, false, false, false, false]);
    await core.defineTokenDelegate(1, delegate.address, [0]);
    
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);
    await token.approve(accounts[1], AMOUNT);
  });

  it("should have audit requirements", async function () {
    const auditRequirements = await delegate.auditRequirements();
    assert.equal(auditRequirements.toString(), 1, "audit requirements");
  });

  it("should transfer from accounts[0] to accounts[1]", async function () {
    const tx = await token.transfer(accounts[1], "3333");
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "Transfer", "event");
    assert.equal(tx.logs[0].args.from, accounts[0], "from");
    assert.equal(tx.logs[0].args.to, accounts[1], "to");
    assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

    const balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0.toString(), "996667", "balance");
    const balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1.toString(), "3333", "balance");
  });

  it("should let define a claim before", async function () {
    const tx = await core.defineClaim(token.address, accounts[1], CLAIM_BEFORE);
    assert.ok(tx.receipt.status, "ClaimDefined");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ClaimDefined", "event");
    assert.equal(tx.logs[0].args.token, token.address, "token");
    assert.equal(tx.logs[0].args.claim, accounts[1], "claim");
    assert.equal(tx.logs[0].args.claimAt, CLAIM_BEFORE, "claimAt");
  });

  describe("With an old claim defined", function () {
    beforeEach(async function () {
      await core.defineClaim(token.address, accounts[1], CLAIM_BEFORE);
    });

    it("should have a latestClaimAt", async function () {
      const tokenData = await core.token(token.address);
      assert.equal(tokenData.latestClaimAt.toString(), CLAIM_BEFORE, "claimAt");
    });

    it("should transfer from accounts[0] to accounts[1] with proofs", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

      const coreEvents = await core.getPastEvents("allEvents", {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber,
      });
      assert.equal(coreEvents.length, 2, "events");
    });

    it("should transferFrom from accounts[0] to accounts[1] with proofs", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

      const coreEvents = await core.getPastEvents("allEvents", {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber,
      });
      assert.equal(coreEvents.length, 2, "events");
    });

    describe("After one transfer", async function () {
      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
      });

      it("should transfer from accounts[0] to accounts[1] with no proofs", async function () {
        const tx = await token.transfer(accounts[1], "3333");
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "Transfer", "event");
        assert.equal(tx.logs[0].args.from, accounts[0], "from");
        assert.equal(tx.logs[0].args.to, accounts[1], "to");
        assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

        const coreEvents = await core.getPastEvents("allEvents", {
          fromBlock: tx.logs[0].blockNumber,
          toBlock: tx.logs[0].blockNumber,
        });
        assert.equal(coreEvents.length, 0, "events");
      });

      it("should transferFrom from accounts[0] to accounts[1] with no proofs", async function () {
        const tx = await token.transfer(accounts[1], "3333");
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "Transfer", "event");
        assert.equal(tx.logs[0].args.from, accounts[0], "from");
        assert.equal(tx.logs[0].args.to, accounts[1], "to");
        assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

        const coreEvents = await core.getPastEvents("allEvents", {
          fromBlock: tx.logs[0].blockNumber,
          toBlock: tx.logs[0].blockNumber,
        });
        assert.equal(coreEvents.length, 0, "events");
      });
    });
  });

  describe("With one recent and old claim defined", function () {
    beforeEach(async function () {
      await core.defineClaim(token.address, accounts[1], CLAIM_AFTER);
      await core.defineClaim(token.address, accounts[2], CLAIM_BEFORE);
      await core.defineClaim(token.address, accounts[3], CLAIM_BEFORE);
    });

    it("should have a latestClaimAt", async function () {
      const tokenData = await core.token(token.address);
      assert.equal(tokenData.latestClaimAt.toString(), CLAIM_AFTER, "latestClaimAt");
    });

    it("should transfer from accounts[0] to accounts[1]", async function () {
      const tx = await token.transfer(accounts[1], "3333");
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[1], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

      const coreEvents = await core.getPastEvents("allEvents", {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber,
      });
      assert.equal(coreEvents.length, 2, "events");
      assert.equal(coreEvents[0].event, "ProofCreated", "event");
      assert.equal(coreEvents[0].returnValues.token, token.address, "token");
      assert.equal(coreEvents[0].returnValues.holder, accounts[0], "holder");
      assert.equal(coreEvents[0].returnValues.proofId, 0, "proofId");
      assert.equal(coreEvents[1].event, "ProofCreated", "event");
      assert.equal(coreEvents[1].returnValues.token, token.address, "token");
      assert.equal(coreEvents[1].returnValues.holder, accounts[1], "holder");
      assert.equal(coreEvents[1].returnValues.proofId, 0, "proofId");
    });

    it("should transferFrom from accounts[0] to accounts[2]", async function () {
      const tx = await token.transferFrom(
        accounts[0], accounts[2], "3333", { from: accounts[1] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "Transfer", "event");
      assert.equal(tx.logs[0].args.from, accounts[0], "from");
      assert.equal(tx.logs[0].args.to, accounts[2], "to");
      assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

      const coreEvents = await core.getPastEvents("allEvents", {
        fromBlock: tx.logs[0].blockNumber,
        toBlock: tx.logs[0].blockNumber,
      });
      assert.equal(coreEvents.length, 2, "events");
      assert.equal(coreEvents[0].event, "ProofCreated", "event");
      assert.equal(coreEvents[0].returnValues.token, token.address, "token");
      assert.equal(coreEvents[0].returnValues.holder, accounts[0], "holder");
      assert.equal(coreEvents[0].returnValues.proofId, 0, "proofId");
      assert.equal(coreEvents[1].event, "ProofCreated", "event");
      assert.equal(coreEvents[1].returnValues.token, token.address, "token");
      assert.equal(coreEvents[1].returnValues.holder, accounts[2], "holder");
      assert.equal(coreEvents[1].returnValues.proofId, 0, "proofId");
    });

    describe("and after two transfers", async function () {
      let block1Time, block2Time;

      beforeEach(async function () {
        await token.transfer(accounts[2], "4555");
        block1Time = (await web3.eth.getBlock("latest")).timestamp;
        await token.transfer(accounts[2], "4555");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should have two proofs for account 0", async function () {
        const proof0 = await core.tokenProofs(token.address, accounts[0], 0);
        assert.deepEqual(Object.values(proof0).map(x => x.toString()),
          [String(AMOUNT), "0", String(block1Time)], "proof id 0");
        const proof1 = await core.tokenProofs(token.address, accounts[0], 1);
        assert.deepEqual(Object.values(proof1).map(x => x.toString()),
          [String(AMOUNT - 4555), String(block1Time), String(block2Time)], "proof id 1");
      });

      it("should have two proofs for account 2", async function () {
        const proof0 = await core.tokenProofs(token.address, accounts[2], 0);
        assert.deepEqual(Object.values(proof0).map(x => x.toString()),
          ["0", "0", String(block1Time)], "proof id 0");
        const proof1 = await core.tokenProofs(token.address, accounts[2], 1);
        assert.deepEqual(Object.values(proof1).map(x => x.toString()),
          [String(4555), String(block1Time), String(block2Time)], "proof id 1");
      });
    });
  });
});
