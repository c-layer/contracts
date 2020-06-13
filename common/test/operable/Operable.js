'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@openfiz.com>
 */

const OperableAsCoreMock = artifacts.require('OperableAsCoreMock.sol');

contract('OperableAsCore', function (accounts) {
  beforeEach(async function () {
    OperableAsCoreMock.new();
  });
});
