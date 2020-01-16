"user strict";

/**
 * @author Cyril Lapinte - <cyril@openfiz.com>
 */

const assertRevert = require("./helpers/assertRevert");
const UserRegistry = artifacts.require("UserRegistry.sol");

contract("UserRegistry", function (accounts) {
  let userRegistry;
  const CHF = web3.utils.toHex("CHF");
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayPlusTwoTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 48;

  describe("without an operator", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new("Test", CHF, [], 0);
      await userRegistry.removeOperator(accounts[0]);
    });

    it("should have a name", async function () {
      const name = await userRegistry.name();
      assert.equal(name, "Test", "name");
    });

    it("should have a currency", async function () {
      const name = await userRegistry.currency();
      assert.equal(name, CHF.padEnd(66, "0"), "currency");
    });

    it("should not register a user", async function () {
      await assertRevert(
        userRegistry.registerUser(accounts[0], dayPlusOneTime),
        "OP01");
    });

    it("should not register many users", async function () {
      await assertRevert(
        userRegistry.registerManyUsersExternal([accounts[0], accounts[1]], dayPlusOneTime),
        "OP01");
    });
  });

  describe("when empty with an operator", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new("Test", CHF, [], 0);
    });

    it("should have extendedKeys", async function () {
      const extendedKeys = await userRegistry.extendedKeys();
      assert.deepEqual(extendedKeys.map((x) => x.toString()), ["0", "1", "2"]);
    });

    it("should not let non operator to define extended keys", async function () {
      await assertRevert(
        userRegistry.defineExtendedKeys([0, 2, 3, 4], { from: accounts[1] }),
        "OP01");
    });

    it("should define extended keys", async function () {
      const tx = await userRegistry.defineExtendedKeys([0, 2, 3, 4]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "ExtendedKeysDefinition", "event");
      assert.deepEqual(tx.logs[0].args.keys.map((x) => x.toString()),
        ["0", "2", "3", "4"], "extendedKeysLog");
    });

    it("should have no users", async function () {
      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 0, "userCount");
    });

    it("should register a user", async function () {
      const tx = await userRegistry.registerUser(accounts[0], dayPlusOneTime);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserRegistered", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[0], "addressLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");

      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 1, "userCount");
      
      const userId = await userRegistry.userId(accounts[0]);
      assert.equal(userId.toNumber(), 1, "userId");

      const validUserId = await userRegistry.validUserId(accounts[0]);
      assert.equal(validUserId.toNumber(), 1, "validUserId");

      const validUser = await userRegistry.validUser(accounts[0], [1]);
      assert.equal(validUser[0], 1, "validUser id");
      assert.equal(validUser[1][0], 0, "validUser key 1");

      const validity = await userRegistry.validity(1);
      assert.equal(validity[0], dayPlusOneTime, "validUntilTime");
      assert.equal(validity[1], false, "suspended");
    });

    it("should register many users", async function () {
      const tx = await userRegistry.registerManyUsersExternal([accounts[0], accounts[1]], dayPlusOneTime);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserRegistered", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[0], "addressLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");
      assert.equal(tx.logs[1].event, "UserRegistered", "event");
      assert.equal(tx.logs[1].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[1].args.address_, accounts[1], "addressLog");
      assert.equal(tx.logs[1].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");

      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 2, "userCount");
      
      const userId1 = await userRegistry.userId(accounts[0]);
      assert.equal(userId1.toNumber(), 1, "userId0");
      const validUserId1 = await userRegistry.validUserId(accounts[0]);
      assert.equal(validUserId1.toNumber(), 1, "validUserId0");

      const userId2 = await userRegistry.userId(accounts[1]);
      assert.equal(userId2, 2, "userId1");
      const validUserId2 = await userRegistry.validUserId(accounts[1]);
      assert.equal(validUserId2.toNumber(), 2, "validUserId1");

      const validUser = await userRegistry.validUser(accounts[0], [1]);
      assert.equal(validUser[0], 1, "validUser id");
      assert.equal(validUser[1][0], 0, "validUser key 1");

      const validity1 = await userRegistry.validity(1);
      assert.equal(validity1[0], dayPlusOneTime, "validUntil1");
      assert.equal(validity1[1], false, "suspended1");
      const validity2 = await userRegistry.validity(2);
      assert.equal(validity2[0], dayPlusOneTime, "validUntil2");
      assert.equal(validity2[1], false, "suspended2");
    });

    it("should fails to check validity for user 6", async function () {
      const validity = await userRegistry.validity(6);
      assert.equal(validity[0], 0, "validUntil");
      assert.equal(validity[1], false, "suspended");
    });

    it("should fails at checking user 6 extended keys", async function () {
      const extend0 = await userRegistry.extended(6, 0);
      assert.equal(extend0, 0, "user6 extended");
    });

    it("should fails at checking user 6 many extended keys", async function () {
      const manyExtended6 = await userRegistry.manyExtended(6, [0, 1]);
      assert.equal(manyExtended6[0], 0, "user6 many extended");
      assert.equal(manyExtended6[1], 0, "user6 many extended");
    });

    it("should return invalid for user 6", async function () {
      const valid = await userRegistry.isValid(6);
      assert.ok(!valid, "user6 invalid");
    });

    it("should return invalid for accounts9", async function () {
      const valid = await userRegistry.isAddressValid(accounts[9]);
      assert.ok(!valid, "accounts9 invalid");
    });

    it("should not attach address to an non existing userId", async function () {
      await assertRevert(userRegistry.attachAddress(1, accounts[0]), "UR01");
    });

    it("should not attach many addresses to non existing userId", async function () {
      await assertRevert(
        userRegistry.attachManyAddressesExternal([1, 2], [accounts[0], accounts[1]]),
        "UR01");
    });

    it("should not attach many addresses if different addresses length than ids", async function () {
      await assertRevert(
        userRegistry.attachManyAddressesExternal([1, 2], [accounts[0]]),
        "UR03");
    });

    it("should not suspend a non existing user", async function () {
      await assertRevert(userRegistry.suspendUser(1), "UR01");
    });

    it("should not restore a non existing user", async function () {
      await assertRevert(userRegistry.restoreUser(1), "UR01");
    });

    it("should not suspend many non existing users", async function () {
      await assertRevert(userRegistry.suspendManyUsersExternal([1, 2, 3]), "UR01");
    });

    it("should not restore many non existing users", async function () {
      await assertRevert(userRegistry.restoreManyUsersExternal([1, 2, 3]), "UR01");
    });

    it("should not update non existing user", async function () {
      await assertRevert(userRegistry.updateUser(1, dayPlusOneTime, false), "UR01");
    });

    it("should not update non existing users", async function () {
      await assertRevert(
        userRegistry.updateManyUsersExternal([1, 2, 3], dayPlusOneTime, false),
        "UR01");
    });

    it("should not update non existing extended user", async function () {
      await assertRevert(userRegistry.updateUserExtended(1, 1, 100), "UR01");
    });

    it("should not update non existing extended user (all)", async function () {
      await assertRevert(userRegistry.updateUserAllExtended(1, [4, 100]), "UR01");
    });

    it("should not update non existing extended users", async function () {
      await assertRevert(
        userRegistry.updateManyUsersExtendedExternal([1, 2, 3], 1, 100), "UR01");
    });

    it("should not update non existing user full", async function () {
      await assertRevert(
        userRegistry.updateUserFull(1, dayPlusOneTime, true, [4, 100]), "UR01");
    });

    it("should not update non existing extended users (all)", async function () {
      await assertRevert(
        userRegistry.updateManyUsersAllExtendedExternal([1, 2, 3], 1, 100), "UR01");
    });

    it("should not update non existing extended users (full)", async function () {
      await assertRevert(
        userRegistry.updateManyUsersFullExternal([1, 2, 3], 1, 100), "UR01");
    });

    it("should prevent non operator to register user full", async function () {
      await assertRevert(
        userRegistry.registerUserFull(accounts[0], dayPlusOneTime, [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should register a user full", async function () {
      const tx = await userRegistry.registerUserFull(accounts[0], dayPlusOneTime, [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserRegistered", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[0], "addressLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");
      assert.equal(tx.logs[1].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[1].args.userId, 1, "userIdLog");
      assert.deepEqual(tx.logs[1].args.values.map((x) => x.toString()),
        ["4", "100"], "extendedKeysLog");
 
      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 1, "userCount");
      
      const userId = await userRegistry.userId(accounts[0]);
      assert.equal(userId.toNumber(), 1, "userId");

      const validUserId = await userRegistry.validUserId(accounts[0]);
      assert.equal(validUserId.toNumber(), 1, "validUserId");

      const validUser = await userRegistry.validUser(accounts[0], [0, 1]);
      assert.equal(validUser[0], 1, "validUser id");
      assert.equal(validUser[1][0], 4, "validUser key0");
      assert.equal(validUser[1][1], 100, "validUser key1");

      const validity = await userRegistry.validity(1);
      assert.equal(validity[0], dayPlusOneTime, "validUntil");
      assert.equal(validity[1], false, "suspended");

      const extend0 = await userRegistry.extended(1, 0);
      assert.equal(extend0, 4, "extended 0");

      const extend1 = await userRegistry.extended(1, 1);
      assert.equal(extend1, 100, "extended 1");

      const manyExtended = await userRegistry.manyExtended(1, [0, 1]);
      assert.equal(manyExtended[0], 4, "extended 0");
      assert.equal(manyExtended[1], 100, "extended 1");
    });

    it("should prevent non operator to register many users full", async function () {
      await assertRevert(
        userRegistry.registerManyUsersFullExternal(
          [accounts[0], accounts[1]], dayPlusOneTime, [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should register many users full", async function () {
      const tx = await userRegistry.registerManyUsersFullExternal(
        [accounts[0], accounts[1]], dayPlusOneTime, [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "UserRegistered", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[0], "addressLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");
      assert.equal(tx.logs[1].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[1].args.userId, 1, "userIdLog");
      assert.deepEqual(tx.logs[1].args.values.map((x) => x.toString()),
        ["4", "100"], "extendedKeysLog");
      assert.equal(tx.logs[2].event, "UserRegistered", "event");
      assert.equal(tx.logs[2].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[2].args.address_, accounts[1], "addressLog");
      assert.equal(tx.logs[2].args.validUntilTime, dayPlusOneTime, "validUntilTimeLog");
      assert.equal(tx.logs[3].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[3].args.userId, 2, "userIdLog");
      assert.deepEqual(tx.logs[3].args.values.map((x) => x.toString()),
        ["4", "100"], "extendedKeysLog");
 
      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 2, "userCount");
      
      const userId1 = await userRegistry.userId(accounts[0]);
      assert.equal(userId1.toNumber(), 1, "userId0");
      const validUserId1 = await userRegistry.validUserId(accounts[0]);
      assert.equal(validUserId1.toNumber(), 1, "validUserId0");

      const validUser1 = await userRegistry.validUser(accounts[0], [0, 1]);
      assert.equal(validUser1[0], 1, "validUser1 id");
      assert.equal(validUser1[1][0], 4, "validUser1 key0");
      assert.equal(validUser1[1][1], 100, "validUser1 key1");

      const userId2 = await userRegistry.userId(accounts[1]);
      assert.equal(userId2, 2, "userId1");
      const validUserId2 = await userRegistry.validUserId(accounts[1]);
      assert.equal(validUserId2.toNumber(), 2, "validUserId1");

      const validUser2 = await userRegistry.validUser(accounts[1], [0, 1]);
      assert.equal(validUser2[0], 2, "validUser2 id");
      assert.equal(validUser2[1][0], 4, "validUser2 key0");
      assert.equal(validUser2[1][1], 100, "validUser2 key1");

      const validity1 = await userRegistry.validity(1);
      assert.equal(validity1[0], dayPlusOneTime, "validUntil1");
      assert.equal(validity1[1], false, "suspended1");
      const validity2 = await userRegistry.validity(2);
      assert.equal(validity2[0], dayPlusOneTime, "validUntil2");
      assert.equal(validity2[1], false, "suspended2");

      const extend01 = await userRegistry.extended(1, 0);
      assert.equal(extend01, 4, "extended 0-1");
      const extend02 = await userRegistry.extended(2, 0);
      assert.equal(extend02, 4, "extended 0-2");

      const extend11 = await userRegistry.extended(1, 1);
      assert.equal(extend11, 100, "extended 1-1");
      const extend12 = await userRegistry.extended(2, 1);
      assert.equal(extend12, 100, "extended 1-2");

      const manyExtended1 = await userRegistry.manyExtended(1, [0, 1]);
      assert.equal(manyExtended1[0], 4, "extended 0-1");
      assert.equal(manyExtended1[1], 100, "extended 0-2");

      const manyExtended2 = await userRegistry.manyExtended(2, [0, 1]);
      assert.equal(manyExtended2[0], 4, "extended 0-1");
      assert.equal(manyExtended2[1], 100, "extended 0-2");
    });
  });

  describe("with 4 accounts registered", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new(
        "Test",
        CHF,
        [accounts[0], accounts[1], accounts[2], accounts[3]], dayPlusOneTime);
      await userRegistry.attachAddress(1, accounts[4]);
      await userRegistry.attachManyAddressesExternal([2, 2], [accounts[5], accounts[6]]);
      await userRegistry.updateUser(3, dayMinusOneTime, false);
    });

    it("should have 4 users", async function () {
      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 4, "userCount");
    });

    it("should gives the same userId for account with multiple addresses", async function () {
      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId.toNumber(), 1, "userId");
    });

    it("should gives not suspended for account1", async function () {
      const validity = await userRegistry.validity(1);
      assert.equal(validity[0], dayPlusOneTime);
      assert.equal(validity[1], false);
    });

    it("should returns not suspended for non existing user", async function () {
      const validity = await userRegistry.validity(6);
      assert.equal(validity[0], 0);
      assert.equal(validity[1], false);
    });

    it("should returns valid for account1 addresses", async function () {
      const isAddress1Valid = await userRegistry.isAddressValid(accounts[1]);
      assert.equal(isAddress1Valid, true, "isAddress1Valid");
      const isAddress4Valid = await userRegistry.isAddressValid(accounts[4]);
      assert.equal(isAddress4Valid, true, "isAddress4Valid");
    });

    it("should returns valid for account1", async function () {
      const isValid = await userRegistry.isValid(1);
      assert.equal(isValid, true, "isValid");
    });

    it("should gives invalid for account3", async function () {
      const isValid = await userRegistry.isValid(3);
      assert.equal(isValid, false, "isValid");
    });

    it("should returns invalid for account2 address", async function () {
      const isAddressValid = await userRegistry.isAddressValid(accounts[2]);
      assert.equal(isAddressValid, false, "isAddressValid");
    });

    it("should not let an address being registered twice", async function () {
      await assertRevert(
        userRegistry.registerUser(accounts[0], dayPlusOneTime),
        "UR03");
    });

    it("should not let an address being attached twice to same user", async function () {
      await assertRevert(userRegistry.attachAddress(1, accounts[0]), "UR02");
    });

    it("should not let an address being attached twice to different user", async function () {
      await assertRevert(userRegistry.attachAddress(2, accounts[0]), "UR02");
    });

    it("should not let an address not attached being detached by the user", async function () {
      await assertRevert(
        userRegistry.detachSelf({ from: accounts[9] }), "UR04");
    });

    it("should not let an address not attached being detached", async function () {
      await assertRevert(userRegistry.detachAddress(accounts[9]), "UR04");
    });

    it("should prevent non operator to suspend a user", async function () {
      await assertRevert(userRegistry.suspendUser(1, { from: accounts[1] }), "OP01");
    });

    it("should suspend a user", async function () {
      const tx = await userRegistry.suspendUser(1);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserSuspended", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");

      const validity = await userRegistry.validity(1);
      assert.equal(validity[0], dayPlusOneTime);
      assert.equal(validity[1], true);
    });

    it("should not let a suspended user being suspended again", async function () {
      await userRegistry.suspendUser(1);
      await assertRevert(userRegistry.suspendUser(1), "UR06");
    });

    it("should not let a restored user being restored again", async function () {
      await assertRevert(userRegistry.restoreUser(1), "UR07");
    });

    it("should prevent non operator to suspend many users", async function () {
      await assertRevert(userRegistry.suspendManyUsersExternal([1, 2],
        { from: accounts[1] }), "OP01");
    });

    it("should suspend many users", async function () {
      const tx = await userRegistry.suspendManyUsersExternal([1, 2]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserSuspended", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[1].event, "UserSuspended", "event");
      assert.equal(tx.logs[1].args.userId, 2, "userIdLog");

      const validity1 = await userRegistry.validity(1);
      assert.equal(validity1[0], dayPlusOneTime, "validUntil1");
      assert.equal(validity1[1], true, "suspended1");

      const validity2 = await userRegistry.validity(2);
      assert.equal(validity2[0], dayPlusOneTime, "validUntil2");
      assert.equal(validity2[1], true, "suspended2");
    });

    it("should detach an address by the same address", async function () {
      const tx = await userRegistry.detachSelf({ from: accounts[4] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "AddressDetached", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[4], "addressLog");

      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId.toNumber(), 0, "userId");
    });

    it("should not detach an address by a different user", async function () {
      await assertRevert(
        userRegistry.detachSelfAddress(accounts[4], { from: accounts[1] }),
        "UR05");
    });

    it("should detach an address by the user", async function () {
      const tx = await userRegistry.detachSelfAddress(accounts[4], { from: accounts[0] });
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "AddressDetached", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[4], "addressLog");

      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId.toNumber(), 0, "userId");
    });

    it("should detach an address", async function () {
      const tx = await userRegistry.detachAddress(accounts[4]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "AddressDetached", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[4], "addressLog");

      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId, 0, "userId");
    });

    it("should prevent non operator to detach many addresses", async function () {
      await assertRevert(
        userRegistry.detachManyAddressesExternal([accounts[1], accounts[2], accounts[4]],
          { from: accounts[1] }), "OP01");
    });

    it("should detach many addresses", async function () {
      const tx = await userRegistry.detachManyAddressesExternal([accounts[1], accounts[2], accounts[4]]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 3);
      assert.equal(tx.logs[0].event, "AddressDetached", "event");
      assert.equal(tx.logs[0].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[0].args.address_, accounts[1], "addressLog");
      assert.equal(tx.logs[1].event, "AddressDetached", "event");
      assert.equal(tx.logs[1].args.userId, 3, "userIdLog");
      assert.equal(tx.logs[1].args.address_, accounts[2], "addressLog");
      assert.equal(tx.logs[2].event, "AddressDetached", "event");
      assert.equal(tx.logs[2].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[2].args.address_, accounts[4], "addressLog");

      const userId2 = await userRegistry.userId(accounts[1]);
      assert.equal(userId2, 0, "userId2");
      const userId3 = await userRegistry.userId(accounts[2]);
      assert.equal(userId3, 0, "userId3");
      const userId4 = await userRegistry.userId(accounts[4]);
      assert.equal(userId4, 0, "userId4");
    });

    it("should prevent non operator to update user", async function () {
      await assertRevert(
        userRegistry.updateUser(1, dayPlusTwoTime, true,
          { from: accounts[1] }), "OP01");
    });

    it("should update user", async function () {
      const tx = await userRegistry.updateUser(1, dayPlusTwoTime, true);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserValidity", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusTwoTime, "validUntilTimeLog");
      assert.equal(tx.logs[1].event, "UserSuspended", "event");
      assert.equal(tx.logs[1].args.userId, 1, "userIdLog");

      const validity1 = await userRegistry.validity(1);
      assert.equal(validity1[0], dayPlusTwoTime, "validUntil1");
      assert.equal(validity1[1], true, "suspended1");
    });

    it("should prevent non operator to update user", async function () {
      await assertRevert(
        userRegistry.updateManyUsersExternal([1, 2], dayPlusTwoTime, true,
          { from: accounts[1] }), "OP01");
    });

    it("should update many users", async function () {
      const tx = await userRegistry.updateManyUsersExternal([1, 2], dayPlusTwoTime, true);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "UserValidity", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.validUntilTime, dayPlusTwoTime, "validUntilTimeLog");
      assert.equal(tx.logs[1].event, "UserSuspended", "event");
      assert.equal(tx.logs[1].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[2].event, "UserValidity", "event");
      assert.equal(tx.logs[2].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[2].args.validUntilTime, dayPlusTwoTime, "validUntilTimeLog");
      assert.equal(tx.logs[3].event, "UserSuspended", "event");
      assert.equal(tx.logs[3].args.userId, 2, "userIdLog");

      const validity1 = await userRegistry.validity(1);
      assert.equal(validity1[0], dayPlusTwoTime, "validUntil1");
      assert.equal(validity1[1], true, "suspended1");
      const validity2 = await userRegistry.validity(2);
      assert.equal(validity2[0], dayPlusTwoTime, "validUntil2");
      assert.equal(validity2[1], true, "suspended2");
    });

    it("should prevent non operator to update user extended", async function () {
      await assertRevert(
        userRegistry.updateUserExtended(1, 1, 100,
          { from: accounts[1] }), "OP01");
    });

    it("should update user extended", async function () {
      const tx = await userRegistry.updateUserExtended(1, 1, 100);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserExtendedKey", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.key, 1, "keyLog");
      assert.equal(tx.logs[0].args.value, 100, "valueLog");
 
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended");
    });

    it("should prevent non operator to update user all extended", async function () {
      await assertRevert(
        userRegistry.updateUserAllExtended(1, [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should update user all extended", async function () {
      const tx = await userRegistry.updateUserAllExtended(1, [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.deepEqual(tx.logs[0].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
  
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended");
    });

    it("should prevent non operator to update user full", async function () {
      await assertRevert(
        userRegistry.updateUserFull(1, dayPlusOneTime, false, [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should update user full", async function () {
      const tx = await userRegistry.updateUserFull(1, dayPlusOneTime, false, [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.deepEqual(tx.logs[0].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
 
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended");
    });

    it("should prevent non operator to update many users extended", async function () {
      await assertRevert(
        userRegistry.updateManyUsersExtendedExternal([1, 2], 1, 100,
          { from: accounts[1] }), "OP01");
    });

    it("should update many users extended", async function () {
      const tx = await userRegistry.updateManyUsersExtendedExternal([1, 2], 1, 100);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserExtendedKey", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.equal(tx.logs[0].args.key, 1, "keyLog");
      assert.equal(tx.logs[0].args.value, 100, "valueLog");
      assert.equal(tx.logs[1].event, "UserExtendedKey", "event");
      assert.equal(tx.logs[1].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[1].args.key, 1, "keyLog");
      assert.equal(tx.logs[1].args.value, 100, "valueLog");
 
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended1");
      const extended2 = await userRegistry.extended(2, 1);
      assert.equal(extended2, 100, "extended2");
    });

    it("should prevent non operator to update many users extended (all)", async function () {
      await assertRevert(
        userRegistry.updateManyUsersAllExtendedExternal([1, 2], [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should update many users extended (all)", async function () {
      const tx = await userRegistry.updateManyUsersAllExtendedExternal([1, 2], [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog");
      assert.deepEqual(tx.logs[0].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
      assert.equal(tx.logs[1].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[1].args.userId, 2, "userIdLog");
      assert.deepEqual(tx.logs[0].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
 
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended1");
      const extended2 = await userRegistry.extended(2, 1);
      assert.equal(extended2, 100, "extended2");
    });

    it("should prevent non operator to update many users full", async function () {
      await assertRevert(
        userRegistry.updateManyUsersFullExternal([1, 2], dayPlusOneTime, false, [4, 100],
          { from: accounts[1] }), "OP01");
    });

    it("should update many users full", async function () {
      const tx = await userRegistry.updateManyUsersFullExternal([1, 2], dayPlusOneTime, true, [4, 100]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, "UserSuspended", "event");
      assert.equal(tx.logs[0].args.userId, 1, "userIdLog0");
      assert.equal(tx.logs[1].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[1].args.userId, 1, "userIdLog1");
      assert.deepEqual(tx.logs[1].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
      assert.equal(tx.logs[2].event, "UserSuspended", "event");
      assert.equal(tx.logs[2].args.userId, 2, "userIdLog2");
      assert.equal(tx.logs[3].event, "UserExtendedKeys", "event");
      assert.equal(tx.logs[3].args.userId, 2, "userIdLog3");
      assert.deepEqual(tx.logs[3].args.values.map((x) => x.toString()),
        ["4", "100"], "valueLog");
 
      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended1");
      const extended2 = await userRegistry.extended(2, 1);
      assert.equal(extended2, 100, "extended2");
    });
  });
 
  describe("with 4 accounts and with 2 accounts suspended", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new("Test", CHF,
        [accounts[0], accounts[1], accounts[2], accounts[3]], dayPlusOneTime);
      await userRegistry.suspendManyUsersExternal([2, 3]);
    });

    it("should restore a user", async function () {
      const tx = await userRegistry.restoreUser(2);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, "UserRestored", "event");
      assert.equal(tx.logs[0].args.userId, 2, "userIdLog");

      const validity = await userRegistry.validity(2);
      assert.equal(validity[0], dayPlusOneTime, "validUntil2");
      assert.equal(validity[1], false, "suspended2");
    });

    it("should restore many users", async function () {
      const tx = await userRegistry.restoreManyUsersExternal([2, 3]);
      assert.ok(tx.receipt.status, "Status");
      assert.equal(tx.logs.length, 2);
      assert.equal(tx.logs[0].event, "UserRestored", "event");
      assert.equal(tx.logs[0].args.userId, 2, "userIdLog");
      assert.equal(tx.logs[1].event, "UserRestored", "event");
      assert.equal(tx.logs[1].args.userId, 3, "userIdLog");

      const validity2 = await userRegistry.validity(2);
      assert.equal(validity2[0], dayPlusOneTime, "validUntil2");
      assert.equal(validity2[1], false, "suspended2");

      const validity3 = await userRegistry.validity(3);
      assert.equal(validity3[0], dayPlusOneTime, "validUntil3");
      assert.equal(validity3[1], false, "suspended3");
    });
  });
});
