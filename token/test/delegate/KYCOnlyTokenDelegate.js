'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const TokenProxy = artifacts.require('TokenProxy.sol');
const TokenCore = artifacts.require('TokenCore.sol');
const KYCOnlyTokenDelegate = artifacts.require('KYCOnlyTokenDelegate.sol');
const YesNoRule = artifacts.require('YesNoRule.sol');
const UserRegistry = artifacts.require('UserRegistry.sol');

const AMOUNT = 1000000;
const NAME = 'Token';
const SYMBOL = 'TKN';
const DECIMALS = 18;
const CHF = 'CHF';
const CHF_BYTES = web3.utils.toHex(CHF).padEnd(42, '0');
const AFTER = 5000000000;
const NULL_ADDRESS = '0x'.padEnd(42, '0');

const AUDIT_TRIGGER_MODE_BOTH = 4;

const TRANSFER_CODE_OK = 1;
const TRANSFER_CODE_LOCK = 5;
const TRANSFER_CODE_FROZEN = 6;
const TRANSFER_CODE_RULE = 7;
const TRANSFER_CODE_NON_REGISTERED_SENDER = 9;
const TRANSFER_CODE_NON_REGISTERED_RECEIVER = 10;

contract('KYCOnlyTokenDelegate', function (accounts) {
  let core, delegate, token, userRegistry;

  before(async function () {
    userRegistry = await UserRegistry.new('Name', web3.utils.toHex(CHF),
      [accounts[0], accounts[1], accounts[2]], AFTER);
    await userRegistry.updateManyUsersAllExtendedExternal([1, 2], [1, '500000', '500000']);
  });

  beforeEach(async function () {
    delegate = await KYCOnlyTokenDelegate.new();
    core = await TokenCore.new('Test', [accounts[0]]);
    await core.defineOracle(userRegistry.address, NULL_ADDRESS, CHF_BYTES);
    await core.defineTokenDelegate(1, delegate.address, [1]);
    await core.defineAuditConfiguration(
      1, 0, AUDIT_TRIGGER_MODE_BOTH, [], [], NULL_ADDRESS, NULL_ADDRESS);
    token = await TokenProxy.new(core.address);
    await core.defineToken(
      token.address, 1, NAME, SYMBOL, DECIMALS);
    await core.mint(token.address, [accounts[0]], [AMOUNT]);
    await token.approve(accounts[1], AMOUNT);
  });

  it('should transfer from accounts[0] to accounts[1]', async function () {
    const tx = await token.transfer(accounts[1], '3333');
    assert.ok(tx.receipt.status, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Transfer', 'event');
    assert.equal(tx.logs[0].args.from, accounts[0], 'from');
    assert.equal(tx.logs[0].args.to, accounts[1], 'to');
    assert.equal(tx.logs[0].args.value.toString(), '3333', 'value');

    const balance0 = await token.balanceOf(accounts[0]);
    assert.equal(balance0.toString(), '996667', 'balance');
    const balance1 = await token.balanceOf(accounts[1]);
    assert.equal(balance1.toString(), '3333', 'balance');
  });

  it('should be transferable from accounts[0] to accounts[1] with no audits', async function () {
    await core.defineTokenDelegate(1, delegate.address, [0]);
    const result = await token.canTransfer(accounts[0], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_OK, 'canTransfer');
  });

  it('should be transferable from accounts[0] to accounts[1] with audits', async function () {
    const result = await token.canTransfer(accounts[0], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_OK, 'canTransfer');
  });

  it('should not be transferable from accounts[0] to accounts[1] if token is locked', async function () {
    await core.defineLock(token.address, 0, AFTER, []);
    await core.defineTokenLocks(token.address, [token.address]);
    const result = await token.canTransfer(accounts[0], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_LOCK, 'canTransfer');
  });

  it('should not be transferable from accounts[0] to accounts[1] if account 1 is frozen', async function () {
    await core.freezeManyAddresses(token.address, [accounts[1]], AFTER);
    const result = await token.canTransfer(accounts[0], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_FROZEN, 'canTransfer');
  });

  it('should not be transferable from accounts[0] to accounts[1] if a rule is invalid', async function () {
    const rule = await YesNoRule.new(false);
    await core.defineRules(token.address, [rule.address]);
    const result = await token.canTransfer(accounts[0], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_RULE, 'canTransfer');
  });

  it('should not be transferable from accounts[0] to accounts[1] if the ssender is not valid', async function () {
    const result = await token.canTransfer(accounts[3], accounts[1], '3333');
    assert.equal(result, TRANSFER_CODE_NON_REGISTERED_SENDER, 'canTransfer');
  });

  it('should not be transferable from accounts[0] to accounts[1] if the receiver is not valid', async function () {
    const result = await token.canTransfer(accounts[0], accounts[3], '3333');
    assert.equal(result, TRANSFER_CODE_NON_REGISTERED_RECEIVER, 'canTransfer');
  });
});
