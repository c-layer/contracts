'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const assertThrow = require('../helpers/assertThrow');
const { assertAuditLog, assertTransferLog, assertTransferDataLog } = require('../helpers/assertLog');
const AuditableDelegateMock = artifacts.require('AuditableDelegateMock.sol');

const CHF = 'CHF';
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(42, '0');
const TOKEN_ADDRESS = '0x' + '123456789'.padStart(40, '0');
const NULL_ADDRESS = '0x'.padEnd(42, '0');

// Estimate
// const ESTIMATE_NO_AUDIT_REQUIRED = 0;
// const ESTIMATE_NO_AUDIT_UPDATE_AUDIT = 0;
// const ESTIMATE_FULL_CONFIGS = 0;
// const ESTIMATE_ONE_DATE_FIELD_AUDIT = 0;
// const ESTIMATE_ONE_UINT_FIELD_AUDIT = 0;
// const ESTIMATE_FOUR_FIELD_AUDIT = 0;

// Audit Trigger Mode
// const AUDIT_UNDEFINED = 0;
const AUDIT_NONE = 1;
const AUDIT_SENDER_ONLY = 2;
const AUDIT_RECEIVER_ONLY = 3;
const AUDIT_BOTH = 4;
const ANY_ADDRESSES = web3.utils.toChecksumAddress(
  '0x' + web3.utils.fromAscii('AnyAddresses').substr(2).padStart(40, '0'));

// Audit Storage
// const AUDIT_STORAGE_ADDRESS = 0;
// const AUDIT_STORAGE_USER_ID = 1;
// const AUDIT_STORAGE_SHARED = 2;

// Test Configurations
const CONFIGURATIONS = {
  none: [
    '0', '0',
    AUDIT_NONE,
    [], [], NULL_ADDRESS, NULL_ADDRESS,
  ],
  both: [
    '1', '1',
    AUDIT_BOTH,
    [], [], NULL_ADDRESS, NULL_ADDRESS,
  ],
  senderOnly: [
    '2', '2',
    AUDIT_SENDER_ONLY,
    [], [], NULL_ADDRESS, NULL_ADDRESS,
  ],
  receiverOnly: [
    '3', '3',
    AUDIT_RECEIVER_ONLY,
    [], [], NULL_ADDRESS, NULL_ADDRESS,
  ],
  bothDifferentCurrency: [
    '4', '4',
    AUDIT_BOTH,
    [], [], NULL_ADDRESS, CHF_BYTES,
  ],
};

const EMPTY_AUDIT = {
  createdAt: '0',
  lastTransactionAt: '0',
  cumulatedEmission: '0',
  cumulatedReception: '0',
};

const getBlockTime = async function (blockNumber) {
  return await web3.eth.getBlock(
    blockNumber).then((block) => ('' + block.timestamp));
};

contract('AuditableDelegate', function (accounts) {
  let delegate, ratesProvider;

  beforeEach(async function () {
    delegate = await AuditableDelegateMock.new();
    await delegate.defineUsers(
      [accounts[0], accounts[1], accounts[2], accounts[3]], [0, 1000, 2500, 3000], [0, 2000, 500, 3000]);

    ratesProvider = delegate;
    Object.values(CONFIGURATIONS).forEach((config) => {
      if (config[6] !== NULL_ADDRESS) {
        // Setting which rates provider to use
        config[5] = ratesProvider.address;
      }
    });
  });

  describe('and audit mode NONE is configured', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.none);
    });

    it('should have no audits required', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.none[0],
        scopeId: CONFIGURATIONS.none[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: false,
        senderAuditRequired: false,
      }, 'audit prepared');
    });

    it('should process the configured NONE audit', async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 4);
      assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: '0',
        senderKeys: [],
        senderFetched: false,
        receiverId: '0',
        receiverKeys: [],
        receiverFetched: false,
        value: '1000',
        convertedValue: '0',
      }, 'No audits');
      for (let i = 1; i < tx.logs.length; i++) {
        assert.equal(tx.logs[i].event, 'LogAuditData', 'event [' + i + ']');
        assertAuditLog(tx.logs[i].args, EMPTY_AUDIT, 'audit [' + i + ']');
      }
    });

    it('should fail without any audit configured', async function () {
      await assertThrow(delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        []));
    });

    it('should process many audits', async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [1, 2, 3]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 10);
      assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: '0',
        senderKeys: [],
        senderFetched: false,
        receiverId: '0',
        receiverKeys: [],
        receiverFetched: false,
        value: '1000',
        convertedValue: '0',
      }, 'transfer log');
      for (let i = 1; i < tx.logs.length; i++) {
        assert.equal(tx.logs[i].event, 'LogAuditData', 'event [' + i + ']');
        assertAuditLog(tx.logs[i].args, EMPTY_AUDIT, 'audit [' + i + ']');
      }
    });
  });

  describe('and one audit mode (BOTH x USER_ID) configured', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.both);
    });

    it('should have the configured audit required', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.both[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.both[0],
        scopeId: CONFIGURATIONS.both[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: true,
        senderAuditRequired: true,
      }, 'audit prepared');
    });

    it('should process the configured audit', async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.both[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 6);
      assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: '2',
        senderKeys: [],
        senderFetched: true,
        receiverId: '3',
        receiverKeys: [],
        receiverFetched: true,
        value: '1000',
        convertedValue: '1000',
      }, 'transfer log');

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: '0',
        cumulatedEmission: '1000',
        cumulatedReception: '0',
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: '0',
        cumulatedEmission: '0',
        cumulatedReception: '1000',
      };
      [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        const logId = i + 1;
        assert.equal(tx.logs[logId].event, 'LogAuditData', 'event [' + logId + ']');
        assertAuditLog(tx.logs[logId].args, audit, 'audit [' + logId + ']');
      });
    });
  });

  describe('and one audit mode (SENDER_ONLY) configured', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.senderOnly);
    });

    describe('with no triggers defined', function () {
      it('should have the configured audit required', async function () {
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
          [CONFIGURATIONS.senderOnly[0]]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
        assertTransferDataLog(tx.logs[0].args, {
          auditConfigurationId: CONFIGURATIONS.senderOnly[0],
          scopeId: CONFIGURATIONS.senderOnly[1],
          currency: '0x0000000000000000000000000000000000000000',
          ratesProvider: '0x0000000000000000000000000000000000000000',
          receiverAuditRequired: false,
          senderAuditRequired: true,
        }, 'audit prepared');
      });

      it('should process the configured audit', async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
          [CONFIGURATIONS.senderOnly[0]]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: '2',
          senderKeys: [],
          senderFetched: true,
          receiverId: '0',
          receiverKeys: [],
          receiverFetched: false,
          value: '1000',
          convertedValue: '1000',
        }, 'transfer log');

        const timestamp = await getBlockTime(tx.receipt.blockNumber);
        const senderAudit = {
          createdAt: timestamp,
          lastTransactionAt: '0',
          cumulatedEmission: '1000',
          cumulatedReception: '0',
        };
        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit].map((audit, i) => {
          const logId = i + 1;
          assert.equal(tx.logs[logId].event, 'LogAuditData', 'event [' + logId + ']');
          assertAuditLog(tx.logs[logId].args, audit, 'audit [' + logId + ']');
        });
      });
    });
  });

  describe('and one audit mode (RECEIVER_ONLY) configured', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.receiverOnly);
    });

    describe('with no triggers defined', function () {
      it('should have the configured audit required', async function () {
        const tx = await delegate.testPrepareAudit(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
          [CONFIGURATIONS.receiverOnly[0]]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 1);
        assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
        assertTransferDataLog(tx.logs[0].args, {
          auditConfigurationId: CONFIGURATIONS.receiverOnly[0],
          scopeId: CONFIGURATIONS.receiverOnly[1],
          currency: '0x0000000000000000000000000000000000000000',
          ratesProvider: '0x0000000000000000000000000000000000000000',
          senderAuditRequired: false,
          receiverAuditRequired: true,
        }, 'audit prepared');
      });

      it('should process the configured audit', async function () {
        const tx = await delegate.testUpdateAllAudits(
          TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
          [CONFIGURATIONS.receiverOnly[0]]);
        assert.ok(tx.receipt.status, 'Status');
        assert.equal(tx.logs.length, 5);
        assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
        assertTransferLog(tx.logs[0].args, {
          token: TOKEN_ADDRESS,
          caller: accounts[0],
          sender: accounts[1],
          receiver: accounts[2],
          senderId: '0',
          senderKeys: [],
          senderFetched: false,
          receiverId: '3',
          receiverKeys: [],
          receiverFetched: true,
          value: '1000',
          convertedValue: '1000',
        }, 'transfer log');

        [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT].map((audit, i) => {
          const logId = i + 1;
          assert.equal(tx.logs[logId].event, 'LogAuditData', 'event [' + logId + ']');
          assertAuditLog(tx.logs[logId].args, audit, 'audit [' + logId + ']');
        });
      });
    });
  });

  describe('and one audit mode (BOTH x DIFFERENT_CURRENCY) configured', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.bothDifferentCurrency);
    });

    it('should have the configured audit required', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.bothDifferentCurrency[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.bothDifferentCurrency[0],
        scopeId: CONFIGURATIONS.bothDifferentCurrency[1],
        currency: CONFIGURATIONS.bothDifferentCurrency[6],
        ratesProvider: CONFIGURATIONS.bothDifferentCurrency[5],
        senderAuditRequired: true,
        receiverAuditRequired: true,
      }, 'audit prepared');
    });

    it('should process the configured audit', async function () {
      const tx = await delegate.testUpdateAllAudits(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.bothDifferentCurrency[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 6);
      assert.equal(tx.logs[0].event, 'LogTransferData', 'event');
      assertTransferLog(tx.logs[0].args, {
        token: TOKEN_ADDRESS,
        caller: accounts[0],
        sender: accounts[1],
        receiver: accounts[2],
        senderId: '2',
        senderKeys: [],
        senderFetched: true,
        receiverId: '3',
        receiverKeys: [],
        receiverFetched: true,
        value: '1000',
        convertedValue: '1500',
      }, 'transfer log');

      const timestamp = await getBlockTime(tx.receipt.blockNumber);
      const senderAudit = {
        createdAt: timestamp,
        lastTransactionAt: '0',
        cumulatedEmission: '1500',
        cumulatedReception: '0',
      };
      const receiverAudit = {
        createdAt: timestamp,
        lastTransactionAt: '0',
        cumulatedEmission: '0',
        cumulatedReception: '1500',
      };
      [EMPTY_AUDIT, EMPTY_AUDIT, EMPTY_AUDIT, senderAudit, receiverAudit].map((audit, i) => {
        const logId = i + 1;
        assert.equal(tx.logs[logId].event, 'LogAuditData', 'event [' + logId + ']');
        assertAuditLog(tx.logs[logId].args, audit, 'audit [' + logId + ']');
      });
    });
  });

  describe('with all audit level configured with different modes', function () {
    beforeEach(async function () {
      await delegate.defineAuditConfiguration(...CONFIGURATIONS.none);
      await delegate.defineAuditTriggers(CONFIGURATIONS.none[0],
        [ANY_ADDRESSES, accounts[1], accounts[1]], [accounts[2], ANY_ADDRESSES, accounts[2]],
        [AUDIT_SENDER_ONLY, AUDIT_RECEIVER_ONLY, AUDIT_BOTH]);
    });

    it('should have the configured audit required for ANY_ADDRESSES', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[0], accounts[3], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.none[0],
        scopeId: CONFIGURATIONS.none[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: false,
        senderAuditRequired: false,
      }, 'audit prepared');
    });

    it('should have the configured audit required for ANY_ADDRESSES sender', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[0], accounts[2], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.none[0],
        scopeId: CONFIGURATIONS.none[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: false,
        senderAuditRequired: true,
      }, 'audit prepared');
    });

    it('should have the configured audit required for ANY_ADDRESSES receiver', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[3], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.none[0],
        scopeId: CONFIGURATIONS.none[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: true,
        senderAuditRequired: false,
      }, 'audit prepared');
    });

    it('should have the configured audit required for specific sender and receiver', async function () {
      const tx = await delegate.testPrepareAudit(
        TOKEN_ADDRESS, accounts[0], accounts[1], accounts[2], '1000',
        [CONFIGURATIONS.none[0]]);
      assert.ok(tx.receipt.status, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'LogTransferAuditData', 'event');
      assertTransferDataLog(tx.logs[0].args, {
        auditConfigurationId: CONFIGURATIONS.none[0],
        scopeId: CONFIGURATIONS.none[1],
        currency: '0x0000000000000000000000000000000000000000',
        ratesProvider: '0x0000000000000000000000000000000000000000',
        receiverAuditRequired: true,
        senderAuditRequired: true,
      }, 'audit prepared');
    });
  });
});
