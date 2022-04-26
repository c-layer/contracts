'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertRevert = require('../helpers/assertRevert');
const signer = require('../helpers/signer');
const SignableTokenERC20 = artifacts.require('SignableTokenERC20.sol');

const NAME = 'name';
const SYMBOL = 'SYM';
const DECIMALS = '18';
const TOTAL_SUPPLY = '10000000';
const NULL_ADDRESS = '0x'.padEnd(42, '0');

const SIGNER_TYPES = [ 'address', 'address', 'address', 'uint256', 'uint64' ];

const VALIDITY = Math.round(new Date().getTime() / 1000) + 3600;

contract('SignableTokenERC20', function (accounts) {
  let token;

  beforeEach(async function () {
    token = await SignableTokenERC20.new(NAME, SYMBOL, DECIMALS, accounts[0], TOTAL_SUPPLY);
  });

  it("should allow to transfer with a signature", async function () {
    const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '42', VALIDITY ], accounts[0]);
    const tx = await token.transferFromWithSignature(accounts[0], accounts[2], '42', VALIDITY, signedHash, { from: accounts[1] });
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[1].event, 'Transfer', 'event');
    assert.equal(tx.logs[1].args.from, accounts[0], 'from');
    assert.equal(tx.logs[1].args.to, accounts[2], 'to');
    assert.equal(tx.logs[1].args.value, '42', 'value');
  });

  it("should prevent to transfer tokens with an outdated signature", async function () {
    const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '42', 0 ], accounts[0]);
    await assertRevert(token.transferFromWithSignature(accounts[0], accounts[1], '42', 0, signedHash, { from: accounts[1] }), 'ST01');
  });

  it("should prevent to transfer too many tokens with a signature", async function () {
    const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '42', VALIDITY ], accounts[0]);
    await assertRevert(token.transferFromWithSignature(accounts[0], accounts[1], '51', VALIDITY, signedHash, { from: accounts[1] }), 'TE03');
  });

  it("should prevent someone else to transfer with a signature", async function () {
    const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '42', VALIDITY ], accounts[0]);
    await assertRevert(token.transferFromWithSignature(accounts[0], accounts[1], '51', VALIDITY, signedHash, { from: accounts[2] }), 'TE03');
  });

  it("should prevent to mint tokens with a non operator signature", async function () {
    const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, NULL_ADDRESS, accounts[1], '42', VALIDITY ], accounts[2]);
    await assertRevert(token.transferFromWithSignature(NULL_ADDRESS, accounts[1], '42', VALIDITY, signedHash, { from: accounts[1] }), 'TE02');
  });

  describe("After define the operators", function () {
    beforeEach(async function () {
      await token.defineOperator('Signer', accounts[2]);
    });

    it("should allow to mint tokens with an operator signature", async function () {
      const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, NULL_ADDRESS, accounts[1], '42', VALIDITY ], accounts[2]);
      const tx = await token.transferFromWithSignature(NULL_ADDRESS, accounts[1], '42', VALIDITY, signedHash, { from: accounts[1] });
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[1].event, 'Transfer', 'event');
      assert.equal(tx.logs[1].args.from, NULL_ADDRESS, 'from');
      assert.equal(tx.logs[1].args.to, accounts[1], 'to');
      assert.equal(tx.logs[1].args.value, '42', 'value');

      const totalSupply = await token.totalSupply();
      assert.equal(totalSupply.toString(), '10000042', 'totalSupply');
    });

    it("should prevent to mint tokens with a non operator signature", async function () {
      const signedHash = await signer.sign(SIGNER_TYPES, [ token.address, NULL_ADDRESS, accounts[1], '42', VALIDITY ], accounts[1]);
      await assertRevert(token.transferFromWithSignature(NULL_ADDRESS, accounts[1], '42', VALIDITY, signedHash, { from: accounts[1] }), 'TE02');
    });
  });

  describe("After a successfull transfer with a signature", function () {
    let signedHash;

    beforeEach(async function () {
      signedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '42', VALIDITY ], accounts[0]);
      const tx = await token.transferFromWithSignature(accounts[0], accounts[1], '42', VALIDITY, signedHash, { from: accounts[1] });
    });

    it("should prevent transfering more tokens with the same signature", async function () {
      await assertRevert(token.transferFromWithSignature(accounts[0], accounts[1], '42', VALIDITY, signedHash, { from: accounts[1] }), 'TE03');
    });

    it("should allow transfering more tokens with a signature", async function () {
      const newSignedHash = await signer.sign(SIGNER_TYPES, [ token.address, accounts[0], accounts[1], '84', VALIDITY ], accounts[0]);
      const tx = await token.transferFromWithSignature(accounts[0], accounts[1], '42', VALIDITY, newSignedHash, { from: accounts[1] });
    });
  });
});
