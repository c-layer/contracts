"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const BaseTokenProxy = artifacts.require("BaseTokenProxy.sol");
const BaseTokenCoreMock = artifacts.require("BaseTokenCoreMock.sol");
const BaseTokenDelegate = artifacts.require("BaseTokenDelegate.sol");

contract("BaseToken", function (accounts) {
  let core, delegatee;

  beforeEach(async function () {
    core = await BaseTokenCoreMock.new();
    delegate = await BaseTokenDelegate.new();
  });

  it("should have a core", async function () {
    const gas = await BaseTokenCoreMock.new.estimateGas();
    assert.equal(gas, 522501, "gas");
  });

  it("should have a delegate", async function () {
    const gas = await BaseTokenDelegate.new.estimateGas();
    assert.equal(gas, 498734, "gas");
  });

  describe("With a token defined", async function () {
    let token, defineTx;

    beforeEach(async function () {
      token = await BaseTokenProxy.new(core.address);
      defineTx = await core.defineProxyDelegate(token.address, delegate.address);
    });

    it("should have a proxy", async function () {
      const gas = await BaseTokenProxy.new.estimateGas(core.address);
      assert.equal(gas, 673665, "gas");
    });

    it("should have a core for token", async function () {
      const coreAddress = await token.core();
      assert.equal(coreAddress, core.address, "core");
    });

    it("should have no total supply for token", async function () {
      const supply = await token.totalSupply();
      assert.equal(supply.toString(), 0, "supply");
    });

    it("should have no balance for accounts[0]", async function () {
      const balance = await token.balanceOf(accounts[0]);
      assert.equal(balance.toString(), 0, "balance");
    });

    it("should have no allowance for accounts[0] to accounts[1]", async function () {
      const allowance = await token.allowance(accounts[0], accounts[1]);
      assert.equal(allowance.toString(), 0, "allowance");
    });

    describe("With supplies defined", async function () {
      const TOTAL_SUPPLY = "1000000";

      beforeEach(async function () {
        await core.defineSupply(token.address, TOTAL_SUPPLY);
      });

      it("should have a total supply for token", async function () {
        const supply = await token.totalSupply();
        assert.equal(supply.toString(), TOTAL_SUPPLY, "supply");
      });

      it("should have a balance for accounts[0]", async function () {
        const balance = await token.balanceOf(accounts[0]);
        assert.equal(balance.toString(), TOTAL_SUPPLY, "balance");
      });

      it("should have no balance for accounts[1] and accounts[2]", async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        assert.equal(balance1.toString(), 0, "balance");
        const balance2 = await token.balanceOf(accounts[2]);
        assert.equal(balance2.toString(), 0, "balance");
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

      it("should estimate transfer from accounts[0]", async function () {
        const gas = await token.transfer.estimateGas(accounts[1], "3333");
        assert.equal(gas, 55510, "estimate");
      });

      it("should prevent transfer too much from accounts[0]", async function () {
        await assertRevert(token.transfer(accounts[1], "1000001"), "XX");
      });

      it("should let accounts[0] provide allowance to accounts[1]", async function () {
        const tx = await token.approve(accounts[1], "3333");
        assert.ok(tx.receipt.status, "Status");
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, "Approval", "event");
        assert.equal(tx.logs[0].args.owner, accounts[0], "owner");
        assert.equal(tx.logs[0].args.spender, accounts[1], "spender");
        assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

        const allowance = await token.allowance(accounts[0], accounts[1]);
        assert.equal(allowance.toString(), "3333", "allowance");
      });

      describe("With an allowance from accounts[0] to accounts[1]", function () {

        beforeEach(async function () {
          await token.approve(accounts[1], "3333");
        });

        it("should have an allowance between accounts[0] and accounts[1]", async function () {
          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "3333", "allowance");
        });

        it("should allow accounts[1] to transferFrom accounts[0] tokens", async function () {
          const tx = await token.transferFrom(accounts[0], accounts[2], "3333", { from: accounts[1] });
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Transfer", "event");
          assert.equal(tx.logs[0].args.from, accounts[0], "from");
          assert.equal(tx.logs[0].args.to, accounts[2], "to");
          assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

          const balance0 = await token.balanceOf(accounts[0]);
          assert.equal(balance0.toString(), "996667", "balance");
          const balance2 = await token.balanceOf(accounts[2]);
          assert.equal(balance2.toString(), "3333", "balance");

          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "0", "allowance");
        });

        it("should estimate transferFrom too much from accounts[0]", async function () {
          const gas = await token.transferFrom.estimateGas(accounts[0], accounts[1], "3333");
          assert.equal(gas, 29343, "estimate");
        });

        it("should prevent transferFrom too much from accounts[0]", async function () {
          await assertRevert(token.transferFrom(accounts[0], accounts[1], "3334"), "XX");
        });

        it("should let accounts[0] increase approval between accounts[0] and accounts[1]", async function () {
          const tx = await token.increaseApproval(accounts[1], "1234");
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Approval", "event");
          assert.equal(tx.logs[0].args.owner, accounts[0], "owner");
          assert.equal(tx.logs[0].args.spender, accounts[1], "spender");
          assert.equal(tx.logs[0].args.value.toString(), "4567", "value");

          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "4567", "allowance");
        });

        it("should let accounts[0] decrease approval between accounts[0] and accounts[1]", async function () {
          const tx = await token.decreaseApproval(accounts[1], "1234");
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Approval", "event");
          assert.equal(tx.logs[0].args.owner, accounts[0], "owner");
          assert.equal(tx.logs[0].args.spender, accounts[1], "spender");
          assert.equal(tx.logs[0].args.value.toString(), "2099", "value");

          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "2099", "allowance");
        });

        it("should prevent decrease approval too much from accounts[0]", async function () {
          await assertRevert(token.decreaseApproval(accounts[0], "3334"), "XX");
        })
      });
    });
  });
});
