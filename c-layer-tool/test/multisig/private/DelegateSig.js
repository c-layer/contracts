"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@gmail.com>
 */

const assertRevert = require("../../helpers/assertRevert");
const signer = require("../../helpers/signer");

// Due to Inheritance linearization, DelegateSig cannot have constructor
// Hence the use of a mock witth a constructor for the test
const DelegateSig = artifacts.require("../contracts/mock/DelegateSigMock.sol");

const Token = artifacts.require("token/ERC20.sol");

contract("DelegateSig", function (accounts) {
  const DATA_TO_SIGN = web3.utils.sha3("GRANT");
  let delegateSig;
  let token, request1, request2, request3;

  describe("with one address and a threshold of 1", function () {
    beforeEach(async function () {
      delegateSig = await DelegateSig.new([ accounts[1] ], 1);
      signer.multiSig = delegateSig;
      token = await Token.new("Test", "TST", delegateSig.address, 1000);
      await token.approve(accounts[0], 500);
      request1 = {
        "params": [{
          "to": token.address,
          "data": token.contract.methods.transfer(accounts[0], 100).encodeABI()
        }]
      };
      request2 = {
        "params": [{
          "to": token.address,
          "data": token.contract.methods.approve(accounts[1], 500).encodeABI()
        }]
      };
      request3 = {
        "params": [{
          "to": token.address,
          "data": token.contract.methods.transferFrom(delegateSig.address, accounts[0], 100).encodeABI()
        }]
      };
    });

    it("should review signatures", async function () {
      const rsv = await signer.sign(request1.params[0].to, 0, request1.params[0].data, 0, accounts[1]);
      const review = await delegateSig.reviewSignatures(
        request1.params[0].to, 0, request1.params[0].data, 0,
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(review.toNumber(), 1);
    });

    it("should have a grant data to sign", async function () {
      const dataToSign = await delegateSig.GRANT();
      assert.equal(dataToSign, DATA_TO_SIGN, "data to sign");
    });

    it("should have a grants hash", async function () {
      const grantsHash = await delegateSig.grantsHash();
      assert.ok(grantsHash, 0, "");
    });

    it("should have grants not defined", async function () {
      const grantsDefined = await delegateSig.grantsDefined();
      assert.ok(!grantsDefined, "grantsDefined");
    });

    it("should have no grant delegates", async function () {
      const grantDelegates = await delegateSig.grantDelegates(
        request1.params[0].to,
        request1.params[0].data.substring(0, 10));
      assert.deepEqual(grantDelegates, [], "grant delegates");
    });

    it("should have no grant threshold", async function () {
      const grantThreshold = await delegateSig.grantThreshold(
        request1.params[0].to,
        request1.params[0].data.substring(0, 10)
      );
      assert.equal(grantThreshold, 0, "no threshold");
    });

    it("should not be possible to add grant without signers", async function () {
      await assertRevert(delegateSig.addGrant(
        [], [], [],
        request1.params[0].to,
        request1.params[0].data.substring(0, 10),
        accounts, 3
      ), "MS01");
    });

    it("should not be possible to add grant with wrong signers", async function () {
      const rsv1 = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[2]);
      await assertRevert(delegateSig.addGrant(
        [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
        request1.params[0].to,
        request1.params[0].data.substring(0, 10),
        accounts, 3
      ), "MS01");
    });

    it("should be possible to add grant", async function () {
      const rsv = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
      const tx = await delegateSig.addGrant(
        [ rsv.r ], [ rsv.s ], [ rsv.v ],
        request1.params[0].to,
        request1.params[0].data.substring(0, 10),
        accounts, 3
      );
      assert.ok(tx.receipt.status, "status");
      assert.equal(tx.logs.length, 0);
    });

    it("should not be possible to end defintion without signers", async function () {
      await assertRevert(delegateSig.endDefinition([ ], [ ], [ ]), "MS01");
    });

    it("should not be possible to end defintion with wrong signers", async function () {
      const grantsHash = await delegateSig.grantsHash();
      const rsv1 = await signer.sign(delegateSig.address, 0, grantsHash, 0, accounts[2]);
      await assertRevert(delegateSig.endDefinition(
        [ rsv1.r ], [ rsv1.s ], [ rsv1.v ]), "MS01");
    });

    it("should not be possible to end defintion with wrong grantsHash signed", async function () {
      const rsv1 = await signer.sign(delegateSig.address, 0, web3.utils.sha3("wrong grants hash"), 0, accounts[2]);
      await assertRevert(delegateSig.endDefinition(
        [ rsv1.r ], [ rsv1.s ], [ rsv1.v ]), "MS01");
    });

    it("should be possible to end defintion", async function () {
      const grantsHash = await delegateSig.grantsHash();
      const rsv = await signer.sign(delegateSig.address, 0, grantsHash, 0, accounts[1]);
      const tx = await delegateSig.endDefinition(
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.ok(tx.receipt.status, "status");
      assert.equal(tx.logs.length, 0);
    });

    it("should not be possible to executeOnBehalf", async function () {
      const rsv1 = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[2]);
      await assertRevert(
        delegateSig.executeOnBehalf(
          [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
          request1.params[0].to, 0, request1.params[0].data),
        "DS02"
      );
    });

    describe("with two grants defined", function () {
      beforeEach(async function () {
        const signer1 = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
        await delegateSig.addGrant(
          [ signer1.r ], [ signer1.s ], [ signer1.v ],
          request1.params[0].to,
          request1.params[0].data.substring(0, 10),
          [ accounts[2], accounts[3] ], 1
        );
        const signer2 = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
        await delegateSig.addGrant(
          [ signer2.r ], [ signer2.s ], [ signer2.v ],
          request2.params[0].to,
          request2.params[0].data.substring(0, 10),
          [ accounts[2], accounts[4], accounts[5] ], 2
        );
      });

      it("should have grant delegates", async function () {
        const grantDelegates = await delegateSig.grantDelegates(
          request1.params[0].to,
          request1.params[0].data.substring(0, 10));
        assert.deepEqual(grantDelegates, [ accounts[2], accounts[3] ], "grant delegates");
      });

      it("should have grant threshold", async function () {
        const grantThreshold = await delegateSig.grantThreshold(
          request1.params[0].to,
          request1.params[0].data.substring(0, 10)
        );
        assert.equal(grantThreshold, 1, "threshold");
      });

      it("should be possible to add grant", async function () {
        const rsv = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
        const tx = await delegateSig.addGrant(
          [ rsv.r ], [ rsv.s ], [ rsv.v ],
          request3.params[0].to,
          request3.params[0].data.substring(0, 10),
          accounts, 3
        );
        assert.ok(tx.receipt.status, "status");
        assert.equal(tx.logs.length, 0);
      });

      it("should not be possible to executeOnBehalf", async function () {
        const rsv1 = await signer.sign(request1.params[0].to, 0, request1.params[0].data, 0, accounts[2]);
        await assertRevert(delegateSig.executeOnBehalf(
          [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
          request1.params[0].to, 0, request1.params[0].data),
          "DS02"
        );
      });

      describe("with two grants defined and definition ended", function () {
        beforeEach(async function () {
          const grantsHash = await delegateSig.grantsHash();
          const signer3 = await signer.sign(delegateSig.address, 0, grantsHash, 0, accounts[1]);
          await delegateSig.endDefinition(
            [ signer3.r ], [ signer3.s ], [ signer3.v ]);
        });

        it("should no be possible to end definition twice", async function () {
          const grantsHash = await delegateSig.grantsHash();
          const signer4 = await signer.sign(delegateSig.address, 0, grantsHash, 0, accounts[1]);
          await assertRevert(delegateSig.endDefinition(
            [ signer4.r ], [ signer4.s ], [ signer4.v ]), "DS03");
        });

        it("should not be possible to add grant", async function () {
          const signer4 = await signer.sign(delegateSig.address, 0, DATA_TO_SIGN, 0, accounts[1]);
          await assertRevert(delegateSig.addGrant(
            [ signer4.r ], [ signer4.s ], [ signer4.v ],
            request3.params[0].to,
            request3.params[0].data.substring(0, 10),
            accounts, 3
          ), "DS03");
        });

        it("should not be possible to executeOnBehalf with incorrect delegates", async function () {
          const rsv1 = await signer.sign(request1.params[0].to, 0, request1.params[0].data, 0, accounts[4]);
          await assertRevert(
            delegateSig.executeOnBehalf(
              [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
              request1.params[0].to, 0, request1.params[0].data),
            "DS01"
          );
        });

        it("should not be possible to executeOnBehalf with insufficient delegates", async function () {
          const rsv1 = await signer.sign(request2.params[0].to, 0, request2.params[0].data, 0, accounts[2]);
          await assertRevert(
            delegateSig.executeOnBehalf(
              [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
              request2.params[0].to, 0, request2.params[0].data),
            "DS01"
          );
        });

        it("should be possible to executeOnBehalf with grant1", async function () {
          const rsv1 = await signer.sign(request1.params[0].to, 0, request1.params[0].data, 0, accounts[2]);
          const tx = await delegateSig.executeOnBehalf(
            [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
            request1.params[0].to, 0, request1.params[0].data);
          assert.ok(tx.receipt.status, "status");
          assert.equal(tx.logs.length, 1, "logs");
          assert.equal(tx.logs[0].event, "Execution");
          assert.equal(tx.logs[0].args.to, token.address, "to");
          assert.equal(tx.logs[0].args.value, 0, "value");
          assert.equal(tx.logs[0].args.data, request1.params[0].data, "data");
        });

        it("should be possible to executeOnBehalf with grant2", async function () {
          const rsv1 = await signer.sign(request2.params[0].to, 0, request2.params[0].data, 0, accounts[2]);
          const rsv2 = await signer.sign(request2.params[0].to, 0, request2.params[0].data, 0, accounts[4]);
          const tx = await delegateSig.executeOnBehalf(
            [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ],
            request2.params[0].to, 0, request2.params[0].data);
          assert.ok(tx.receipt.status, "status");
          assert.equal(tx.logs.length, 1, "logs");
          assert.equal(tx.logs[0].event, "Execution");
          assert.equal(tx.logs[0].args.to, token.address, "to");
          assert.equal(tx.logs[0].args.value, 0, "value");
          assert.equal(tx.logs[0].args.data, request2.params[0].data, "data");
        });
      });
    });
  });
});
