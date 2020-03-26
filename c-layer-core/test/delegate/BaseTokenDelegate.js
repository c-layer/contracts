"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require("../helpers/assertRevert");
const TokenProxy = artifacts.require("TokenProxy.sol");
const TokenCoreMock = artifacts.require("TokenCoreMock.sol");
const BaseTokenDelegate = artifacts.require("BaseTokenDelegate.sol");

const NAME = "Token";
const SYMBOL = "TKN";
const DECIMALS = 18;

contract("BaseToken", function (accounts) {
  let core, delegate;

  beforeEach(async function () {
    delegate = await BaseTokenDelegate.new();
    core = await TokenCoreMock.new("Test");
    await core.defineTokenDelegate(0, delegate.address, []);
  });

  describe("With a token defined", async function () {
    let token;

    beforeEach(async function () {
      token = await TokenProxy.new(core.address);
      await core.defineToken(
        token.address, 0, NAME, SYMBOL, DECIMALS);
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
        await core.defineSupplyMock(token.address, TOTAL_SUPPLY);
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

      it("should prevent transfer too much from accounts[0]", async function () {
        await assertRevert(token.transfer(accounts[1], "1000001"), "CO03");
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

      describe("With an allowance from accounts[0] to accounts[1] (non operator)", function () {
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

        it("should let decrease approval too much from accounts[1]", async function () {
          const tx = await token.decreaseApproval(accounts[1], "3334");
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Approval", "event");
          assert.equal(tx.logs[0].args.owner, accounts[0], "owner");
          assert.equal(tx.logs[0].args.spender, accounts[1], "spender");
          assert.equal(tx.logs[0].args.value.toString(), "0", "value");
        });
      });

      describe("With no allowance and token provided to accounts[1]", function () {
        beforeEach(async function () {
          await token.transfer(accounts[1], "3333");
        });

       it("should let operator transfer token from accounts[1]", async function () {
          const tx = await token.transferFrom(accounts[1], accounts[2], "3333", { from: accounts[0] });
          assert.ok(tx.receipt.status, "Status");
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, "Transfer", "event");
          assert.equal(tx.logs[0].args.from, accounts[1], "from");
          assert.equal(tx.logs[0].args.to, accounts[2], "to");
          assert.equal(tx.logs[0].args.value.toString(), "3333", "value");

          const balance0 = await token.balanceOf(accounts[1]);
          assert.equal(balance0.toString(), "0", "balance");
          const balance2 = await token.balanceOf(accounts[2]);
          assert.equal(balance2.toString(), "3333", "balance");

          const allowance = await token.allowance(accounts[0], accounts[1]);
          assert.equal(allowance.toString(), "0", "allowance");
        });

        it("should prevent transferFrom too much from accounts[1]", async function () {
          await assertRevert(token.transferFrom(accounts[1], accounts[2], "3334"), "CO03");
        });

        describe("With accounts[1] self managed", function () {
          beforeEach(async function () {
            await core.manageSelf(true, { from: accounts[1] });
          });

          it("should prevent transferFrom from accounts[1]", async function () {
            await assertRevert(token.transferFrom(accounts[1], accounts[2], "3333", { from: accounts[0] }), "CO03");
          });
        });
      });
    });
  });
});
