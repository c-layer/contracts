"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const Whitelist = artifacts.require("../contracts/Whitelist.sol");

contract("Whitelist", function (accounts) {
  let whitelist;

  beforeEach(async function () {
    whitelist = await Whitelist.new([accounts[1], accounts[2]]);
    assert.ok(await whitelist.isWhitelisted(accounts[1]), "accounts[1]");
    assert.ok(await whitelist.isWhitelisted(accounts[2]), "accounts[2]");
    assert.ok(!(await whitelist.isWhitelisted(accounts[3])), "accounts[3]");
    assert.ok(!(await whitelist.isWhitelisted(accounts[4])), "accounts[4]");
  });

  it("should approve an address", async function () {
    const receipt = await whitelist.approveAddress(accounts[3]);
    assert.ok(await whitelist.isWhitelisted(accounts[3]));

    assert.equal(receipt.logs.length, 1);
    assert.equal(receipt.logs[0].event, "AddressApproved");
    assert.equal(receipt.logs[0].args._address, accounts[3]);
  });

  it("should not reapprove an address", async function () {
    const receipt = await whitelist.approveAddress(accounts[1]);
    assert.ok(await whitelist.isWhitelisted(accounts[1]));
    assert.equal(receipt.logs.length, 0);
  });

  it("should approve many addresses", async function () {
    const receipt = await whitelist.approveManyAddresses([accounts[3], accounts[4]]);
    assert.ok(await whitelist.isWhitelisted(accounts[3]));
    assert.ok(await whitelist.isWhitelisted(accounts[4]));
    assert.equal(receipt.logs.length, 2);
    assert.equal(receipt.logs[0].event, "AddressApproved");
    assert.equal(receipt.logs[0].args._address, accounts[3]);
    assert.equal(receipt.logs[1].event, "AddressApproved");
    assert.equal(receipt.logs[1].args._address, accounts[4]);
  });

  it("should only approve unapproved addresses", async function () {
    const receipt = await whitelist.approveManyAddresses(accounts.slice(1, 5));
    assert.ok(await whitelist.isWhitelisted(accounts[1]), "address1");
    assert.ok(await whitelist.isWhitelisted(accounts[2]), "address2");
    assert.ok(await whitelist.isWhitelisted(accounts[3]), "address3");
    assert.equal(receipt.logs.length, 2);
    assert.ok(await whitelist.isWhitelisted(accounts[4]), "address4");
    assert.equal(receipt.logs[0].event, "AddressApproved");
    assert.equal(receipt.logs[0].args._address, accounts[3]);
    assert.equal(receipt.logs[1].event, "AddressApproved");
    assert.equal(receipt.logs[1].args._address, accounts[4]);
  });

  it("should reject an address", async function () {
    const receipt = await whitelist.rejectAddress(accounts[1]);
    assert.ok(!(await whitelist.isWhitelisted(accounts[1])));
    assert.equal(receipt.logs.length, 1);
    assert.equal(receipt.logs[0].event, "AddressRejected");
    assert.equal(receipt.logs[0].args._address, accounts[1]);
  });

  it("should not rereject an address", async function () {
    const receipt = await whitelist.rejectAddress(accounts[3]);
    assert.ok(!(await whitelist.isWhitelisted(accounts[3])));
    assert.equal(receipt.logs.length, 0);
  });

  it("should reject many addresses", async function () {
    const receipt = await whitelist.rejectManyAddresses([accounts[1], accounts[2]]);
    assert.ok(!(await whitelist.isWhitelisted(accounts[1])));
    assert.ok(!(await whitelist.isWhitelisted(accounts[2])));
    assert.equal(receipt.logs.length, 2);
    assert.equal(receipt.logs[0].event, "AddressRejected");
    assert.equal(receipt.logs[0].args._address, accounts[1]);
    assert.equal(receipt.logs[1].event, "AddressRejected");
    assert.equal(receipt.logs[1].args._address, accounts[2]);
  });

  it("should only reject approved addresses", async function () {
    const receipt = await whitelist.rejectManyAddresses(accounts.slice(1, 5));
    assert.ok(!(await whitelist.isWhitelisted(accounts[1])));
    assert.ok(!(await whitelist.isWhitelisted(accounts[2])));
    assert.ok(!(await whitelist.isWhitelisted(accounts[3])));
    assert.ok(!(await whitelist.isWhitelisted(accounts[4])));
    assert.equal(receipt.logs.length, 2);
    assert.equal(receipt.logs[0].event, "AddressRejected");
    assert.equal(receipt.logs[0].args._address, accounts[1]);
    assert.equal(receipt.logs[1].event, "AddressRejected");
    assert.equal(receipt.logs[1].args._address, accounts[2]);
  });
});
