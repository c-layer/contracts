"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */

const assertRevert = require("../../helpers/assertRevert");
const signer = require("../../helpers/signer");
const LockableSig = artifacts.require("../contracts/multisig/private/LockableSig.sol");
const Token = artifacts.require("token/Token.sol");

contract("LockableSig", function (accounts) {
  const DATA_TO_SIGN = web3.utils.sha3("LOCK");
  let token, request;
  let lockableSig;

  describe("with one address and threshold of 1", function () {
    beforeEach(async function () {
      lockableSig = await LockableSig.new([ accounts[1] ], 1);
      signer.multiSig = lockableSig;
      token = await Token.new(lockableSig.address, 1000);
      request = {
        "params": [{
          "to": token.address,
          "data": token.contract.methods.transfer(accounts[0], 100).encodeABI()
        }]
      };
    });

    it("should provide data to sign", async function () {
      const dataToSign = await lockableSig.LOCK();
      assert.equal(DATA_TO_SIGN, dataToSign, "data to sign");
    });

    it("should be unlocked", async function () {
      const locked = await lockableSig.isLocked();
      assert.ok(!locked, "locked");
    });

    it("should lock", async function () {
      const tx = await lockableSig.lock({ from: accounts[1] });
      assert.ok(tx.receipt.status, "status");

      const locked = await lockableSig.isLocked();
      assert.ok(locked, "locked");
    });

    it("should prevent non signer to lock", async function () {
      await assertRevert(lockableSig.lock(), "MS03");
    });

    it("should execute ERC20 transfer", async function () {
      const rsv = await signer.sign(request.params[0].to, 0, request.params[0].data, 0, accounts[1]);

      const tx = await lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
        request.params[0].to, 0, request.params[0].data, 0);
      assert.ok(tx.receipt.status, "status");

      const balance = await token.balanceOf(lockableSig.address);
      assert.equal(balance, 900, "balance multisig");
      const balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 100, "balance account 0");
    });

    describe("when locked", function () {
      beforeEach(async function () {
        await lockableSig.lock({ from: accounts[1] });
      });

      it("should prevent ERC20 transfer", async function () {
        const rsv = await signer.sign(request.params[0].to, 0, request.params[0].data, 0, accounts[1]);

        await assertRevert(
          lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
            request.params[0].to, 0, request.params[0].data, 0),
          "LS01");
      });

      it("should unlock", async function () {
        const rsv = await signer.sign(lockableSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
        const tx = await lockableSig.unlock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
        assert.ok(tx.receipt.status, "status");

        const locked = await lockableSig.isLocked();
        assert.ok(!locked, "locked");
      });

      describe("when unlocked", function () {
        beforeEach(async function () {
          const rsv = await signer.sign(lockableSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
          await lockableSig.unlock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
        });

        it("should execute ERC20 transfer", async function () {
          const rsv = await signer.sign(request.params[0].to, 0, request.params[0].data, 0, accounts[1]);

          const tx = await lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
            request.params[0].to, 0, request.params[0].data, 0);
          assert.ok(tx.receipt.status, "status");

          const balance = await token.balanceOf(lockableSig.address);
          assert.equal(balance, 900, "balance multisig");
          const balance0 = await token.balanceOf(accounts[0]);
          assert.equal(balance0, 100, "balance account 0");
        });
      });
    });
  });
});
