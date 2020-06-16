"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const UserRule = artifacts.require("UserRule.sol");
const UserRegistryMock = artifacts.require("UserRegistryMock.sol");

contract("UserRule", function (accounts) {
  let rule, userRegistry;

  const CHF = web3.utils.toHex("CHF").padEnd(66, "0");

  beforeEach(async function () {
    userRegistry = await UserRegistryMock.new(
      [accounts[0], accounts[1], accounts[2]], CHF, [5, 5000000]);
    rule = await UserRule.new(userRegistry.address);
  });

  it("should have a user registry", async function () {
    const address = await rule.userRegistry();
    assert.equal(address, userRegistry.address, "user registry");
  });

  it("should have is address valid for accounts 0", async function () {
    const isAddressValid = await rule.isAddressValid(accounts[0]);
    assert.ok(isAddressValid, "address valid");
  });

  it("should have is address invalid for accounts3", async function () {
    const isAddressValid = await rule.isAddressValid(accounts[3]);
    assert.ok(!isAddressValid, "address invalid");
  });

  it("should have transfer between two registred user valid", async function () {
    const isTransferValid = await rule.isTransferValid(accounts[0], accounts[1], 1000);
    assert.ok(isTransferValid, "address valid");
  });

  it("should have transfer between two non registred invalid", async function () {
    const isTransferValid = await rule.isTransferValid(accounts[3], accounts[4], 1000);
    assert.ok(!isTransferValid, "address invalid");
  });

  it("should have transfer from a non registred invalid", async function () {
    const isTransferValid = await rule.isTransferValid(accounts[3], accounts[0], 1000);
    assert.ok(!isTransferValid, "address invalid");
  });

  it("should have transfer to a non registred invalid", async function () {
    const isTransferValid = await rule.isTransferValid(accounts[0], accounts[3], 1000);
    assert.ok(!isTransferValid, "address invalid");
  });
});
