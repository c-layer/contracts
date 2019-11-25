"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCore = artifacts.require("TokenCoreMock.sol");
const ProvableOwnershipTokenDelegate = artifacts.require("ProvableOwnershipTokenDelegate.sol");

const AMOUNT = 1000000;
const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;
const AUDIT_ALWAYS = 3;

contract("ProvableOwnershipTokenDelegate", function (accounts) {
  let core, delegate, token;

  beforeEach(async function () {
    delegate = await ProvableOwnershipTokenDelegate.new();
    core = await TokenCore.new("Test");
    await core.defineAuditConfiguration(
      0, AUDIT_ALWAYS, 0, false,
      [ false, false, true ],
      [ false, true, false, false, false, false]);
    await core.defineTokenDelegate(0, delegate.address, [ 0 ]);
 
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 0, NAME, SYMBOL, DECIMALS);
    await core.defineSupplyMock(token.address, AMOUNT);
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

  it("should have no proof id=0 for account 0", async function () {
    const proof = await core.tokenProofs(token.address, accounts[0], 0);
    assert.deepEqual(Object.values(proof).map(x => x.toString()),
      ["0", "0", "0"], "no proofs id 0");
  });

  it("should let create proof for account 0", async function () {
    const tx = await core.createProof(token.address, accounts[0]);
    assert.ok(tx.receipt.status, "Status");
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, "ProofCreated", "event");
    assert.equal(tx.logs[0].args.token, token.address, "token");
    assert.equal(tx.logs[0].args.holder, accounts[0], "holder");
    assert.equal(tx.logs[0].args.proofId, 0, "proofId");
  });

  describe("With a proof created for account 0", function () {
    let block1Time;

    beforeEach(async function () {
      await core.createProof(token.address, accounts[0]);
      block1Time = (await web3.eth.getBlock("latest")).timestamp;
    });

    it("should have a proof", async function () {
      const proof = await core.tokenProofs(token.address, accounts[0], 0);
      assert.deepEqual(Object.values(proof).map(x => x.toString()),
        [String(AMOUNT), "0", String(block1Time)], "proof id 0");
    });

    describe("With a second proof created for account 0 after a transfer", function () {
      let block2Time, block3Time;

      beforeEach(async function () {
        await token.transfer(accounts[1], "3333");
        block2Time = (await web3.eth.getBlock("latest")).timestamp;
        await core.createProof(token.address, accounts[0]);
        block3Time = (await web3.eth.getBlock("latest")).timestamp;
      });

      it("should let create another proof for account 0", async function () {
        const tx = await core.createProof(token.address, accounts[0]);
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "ProofCreated", "event");
        assert.equal(tx.logs[0].args.token, token.address, "token");
        assert.equal(tx.logs[0].args.holder, accounts[0], "holder");
        assert.equal(tx.logs[0].args.proofId, 2, "proofId");
      });

      it("should have a second proof", async function () {
        const proof = await core.tokenProofs(token.address, accounts[0], 1);
        assert.deepEqual(Object.values(proof).map(x => x.toString()),
          [String(AMOUNT - 3333), String(block2Time), String(block3Time)], "proof id 1");
      });
    });
  });
});
