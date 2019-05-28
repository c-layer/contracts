"user strict";

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const assertRevert = require("./helpers/assertRevert");
const UserRegistry = artifacts.require("UserRegistry.sol");

contract("UserRegistry", function (accounts) {
  let userRegistry;
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayPlusTwoTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 48;

  describe("without an operator", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new([], 0);
      await userRegistry.removeOperator(accounts[0]);
    });

    it("should not register a user", async function () {
      await assertRevert(
        userRegistry.registerUser(accounts[0], dayPlusOneTime),
        "OP01");
    });

    it("should not register many users", async function () {
      await assertRevert(
        userRegistry.registerManyUsers([ accounts[0], accounts[1] ], dayPlusOneTime),
        "OP01");
    });
  });

  describe("when empty with an operator", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new([], 0);
    });

    it("should have no users", async function () {
      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 0, "userCount");
    });

    it("should register a user", async function () {
      await userRegistry.registerUser(accounts[0], dayPlusOneTime);

      const userCount = await userRegistry.userCount();
      assert.equal(userCount.toNumber(), 1, "userCount");
      
      const userId = await userRegistry.userId(accounts[0]);
      assert.equal(userId.toNumber(), 1, "userId");

      const validUserId = await userRegistry.validUserId(accounts[0]);
      assert.equal(validUserId.toNumber(), 1, "validUserId");

      const suspended = await userRegistry.suspended(1);
      assert.equal(suspended, false, "suspended");

      const validUntilTime = await userRegistry.validUntilTime(1);
      assert.equal(validUntilTime, dayPlusOneTime, "validUntilTime");
    });

    it("should register many users", async function () {
      await userRegistry.registerManyUsers([ accounts[0], accounts[1] ], dayPlusOneTime);

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

      const suspended1 = await userRegistry.suspended(1);
      assert.equal(suspended1, false, "suspended1");
      const suspended2 = await userRegistry.suspended(2);
      assert.equal(suspended2, false, "suspended2");

      const validUntilTime1 = await userRegistry.validUntilTime(1);
      assert.equal(validUntilTime1, dayPlusOneTime, "validUntilTime1");
      const validUntilTime2 = await userRegistry.validUntilTime(2);
      assert.equal(validUntilTime2, dayPlusOneTime, "validUntilTime2");
    });

    it("should fails to check validUntilTime for user 6", async function () {
      const validUntilTime = await userRegistry.validUntilTime(6);
      assert.equal(validUntilTime.toNumber(), 0, "validUntilTime user6");
    });

    it("should fails to check if user 6 is suspended", async function () {
      const suspended6 = await userRegistry.suspended(6);
      assert.ok(!suspended6, "user6 not suspended");
    });

    it("should fails at checking user 6 extended keys", async function () {
      const extend0 = await userRegistry.extended(6, 0);
      assert.equal(extend0, 0, "user6 extended");
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
        userRegistry.attachManyAddresses([ 1, 2 ], [ accounts[0], accounts[1] ]),
        "UR01");
    });

    it("should not attach many addresses if different addresses length than ids", async function () {
      await assertRevert(
        userRegistry.attachManyAddresses([ 1, 2 ], [ accounts[0] ]),
        "UR03");
    });

    it("should not suspend a non existing user", async function () {
      await assertRevert(userRegistry.suspendUser(1), "UR01");
    });

    it("should not unsuspend a non existing user", async function () {
      await assertRevert(userRegistry.unsuspendUser(1), "UR01");
    });

    it("should not suspend many non existing users", async function () {
      await assertRevert(userRegistry.suspendManyUsers([1, 2, 3]), "UR01");
    });

    it("should not unsuspend many non existing users", async function () {
      await assertRevert(userRegistry.unsuspendManyUsers([1, 2, 3]), "UR01");
    });

    it("should not update non existing user", async function () {
      await assertRevert(userRegistry.updateUser(1, dayPlusOneTime, false), "UR01");
    });

    it("should not update non existing users", async function () {
      await assertRevert(
        userRegistry.updateManyUsers([ 1, 2, 3 ], dayPlusOneTime, false),
        "UR01");
    });

    it("should not update non existing extended user", async function () {
      await assertRevert(userRegistry.updateUserExtended(1, 1, 100), "UR01");
    });

    it("should not update non existing extended users", async function () {
      await assertRevert(
        userRegistry.updateManyUsersExtended([ 1, 2, 3 ], 1, 100), "UR01");
    });
  });

  describe("with 4 accounts registred", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new([accounts[0], accounts[1], accounts[2], accounts[3]], dayPlusOneTime);
      await userRegistry.attachAddress(1, accounts[4]);
      await userRegistry.attachManyAddresses([ 2, 2 ], [accounts[5], accounts[6]]);
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

    it("should gives unsuspend for account1", async function () {
      const isLocked = await userRegistry.suspended(1);
      assert.ok(!isLocked, "unsuspended");
    });

    it("should returns unsuspend for non existing user", async function () {
      const isLocked = await userRegistry.suspended(6);
      assert.ok(!isLocked, "unsuspended");
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

    it("should suspend a user", async function () {
      await userRegistry.suspendUser(1);
      const suspended = await userRegistry.suspended(1);
      assert.equal(suspended, true, "suspended");
    });

    it("should not let a suspended user being suspended again", async function () {
      await userRegistry.suspendUser(1);
      await assertRevert(userRegistry.suspendUser(1), "UR06");
    });

    it("should not let an unsuspended user being unsuspended again", async function () {
      await assertRevert(userRegistry.unsuspendUser(1), "UR07");
    });

    it("should suspend many users", async function () {
      await userRegistry.suspendManyUsers([1, 2]);
      const suspended1 = await userRegistry.suspended(1);
      assert.equal(suspended1, true, "suspended0");
      const suspended2 = await userRegistry.suspended(2);
      assert.equal(suspended2, true, "suspended1");
    });

    it("should detach an address by the same address", async function () {
      await userRegistry.detachSelf({ from: accounts[4] });
      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId.toNumber(), 0, "userId");
    });

    it("should not detach an address by a different user", async function () {
      await assertRevert(
        userRegistry.detachSelfAddress(accounts[4], { from: accounts[1] }),
        "UR05");
    });

    it("should detach an address by the user", async function () {
      await userRegistry.detachSelfAddress(accounts[4], { from: accounts[0] });
      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId.toNumber(), 0, "userId");
    });

    it("should detach an address", async function () {
      await userRegistry.detachAddress(accounts[4]);
      const userId = await userRegistry.userId(accounts[4]);
      assert.equal(userId, 0, "userId");
    });

    it("should detach many addresses", async function () {
      await userRegistry.detachManyAddresses([accounts[1], accounts[2], accounts[4]]);
      const userId2 = await userRegistry.userId(accounts[1]);
      assert.equal(userId2, 0, "userId2");
      const userId3 = await userRegistry.userId(accounts[2]);
      assert.equal(userId3, 0, "userId3");
      const userId4 = await userRegistry.userId(accounts[4]);
      assert.equal(userId4, 0, "userId4");
    });

    it("should update user", async function () {
      await userRegistry.updateUser(1, dayPlusTwoTime, true);

      const validUntilTime = await userRegistry.validUntilTime(1);
      assert.equal(validUntilTime, dayPlusTwoTime, "validUntilTime");
      const suspended = await userRegistry.suspended(1);
      assert.equal(suspended, true, "suspended");
    });

    it("should update many users", async function () {
      await userRegistry.updateManyUsers([ 1, 2 ], dayPlusTwoTime, true);

      const validUntilTime1 = await userRegistry.validUntilTime(1);
      assert.equal(validUntilTime1, dayPlusTwoTime, "validUntilTime");
      const suspended1 = await userRegistry.suspended(1);
      assert.equal(suspended1, true, "suspended");
     
      const validUntilTime2 = await userRegistry.validUntilTime(2);
      assert.equal(validUntilTime2, dayPlusTwoTime, "validUntilTime2");
      const suspended2 = await userRegistry.suspended(2);
      assert.equal(suspended2, true, "suspended");
    });

    it("should update user extended", async function () {
      await userRegistry.updateUserExtended(1, 1, 100);

      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended");
    });

    it("should update many users extended", async function () {
      await userRegistry.updateManyUsersExtended([ 1, 2 ], 1, 100);

      const extended1 = await userRegistry.extended(1, 1);
      assert.equal(extended1, 100, "extended1");
      const extended2 = await userRegistry.extended(2, 1);
      assert.equal(extended2, 100, "extended2");
    });
  });
 
  describe("with 4 accounts and with 2 accounts suspended", function () {
    beforeEach(async function () {
      userRegistry = await UserRegistry.new([accounts[0], accounts[1], accounts[2], accounts[3]], dayPlusOneTime);
      await userRegistry.suspendManyUsers([ 2, 3 ]);
    });

    it("should unsuspend a user", async function () {
      await userRegistry.unsuspendUser(2);
      const suspended = await userRegistry.suspended(2);
      assert.equal(suspended, false, "suspended");
    });

    it("should unsuspend many users", async function () {
      await userRegistry.unsuspendManyUsers([ 2, 3 ]);

      const suspended2 = await userRegistry.suspended(2);
      assert.equal(suspended2, false, "suspended2");
      const suspended3 = await userRegistry.suspended(3);
      assert.equal(suspended3, false, "suspended3"); ;
    });
  });
});
