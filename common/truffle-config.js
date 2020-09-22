/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * truffleframework.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like truffle-hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura API
 * keys are available for free at: infura.io/register
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');

// Secret file format is:
// { mnemonic: '', infuraKey, '', endpoints: { <networkname>: 'http://endpoint' } }
const path = [ "~/.secret.json", "../.secret.json", "../../.secret.json", "../../../.secret.json" ];
let secret, mnemonic, projectId, endpoints;
for (let i=0; i < path.length && !secret; i++) {
  if (fs.existsSync(path[i])) {
    secret = JSON.parse(fs.readFileSync(path[i]));
  }
  
  if (secret) {
    mnemonic = secret.mnemonic;
    projectId = secret.projectId;
    endpoints = secret.endpoints;
  }
}

let config = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
      gas: 6500000,
      gasPrice: 0x01,
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },

    // Another network with more advanced options...
    // advanced: {
      // port: 8777,             // Custom port
      // network_id: 1342,       // Custom network
      // gas: 8500000,           // Gas sent with each transaction (default: ~6700000)
      // gasPrice: 20000000000,  // 20 gwei (in wei) (default: 100 gwei)
      // from: <address>,        // Account to send txs from (default: accounts[0])
      // websockets: true        // Enable EventEmitter interface for web3 (default: false)
    // },

    // Useful for deploying to a public network.
    // NB: It's important to wrap the provider as a function.
    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/"+projectId, 0, 5),
      network_id: 3,       // Ropsten's id
      gas: 5500000,        // Ropsten has a lower block limit than mainnet
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/v3/"+projectId, 0, 5),
      network_id: 4,       // Rinkeby's id
      gas: 5500000,        //
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    goerli: {
      provider: () => new HDWalletProvider(mnemonic, "https://goerli.infura.io/v3/"+projectId, 0, 5),
      network_id: 5,       // Goerli's id
      gas: 5500000,        //
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    kovan: {
      provider: () => new HDWalletProvider(mnemonic, "https://kovan.infura.io/v3/"+projectId, 0, 5),
      network_id: 42,      // Kovan's id
      gas: 5500000,        //
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
    mainnet: {
      provider: () => new HDWalletProvider(mnemonic, "https://mainnet.infura.io/v3/"+projectId, 0, 5),
      network_id: 1,       // Mainnet's id
      gas: 6500000,        // This is a safe block limit
      confirmations: 2,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  plugins: [
    "solidity-coverage"
  ],

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.12",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 10000,
/*          details: {
            // The peephole optimizer is always on if no details are given,
            // use details to switch it off.
            "peephole": true,
           // The unused jumpdest remover is always on if no details are given,
           // use details to switch it off.
           "jumpdestRemover": true,
           // Sometimes re-orders literals in commutative operations.
           "orderLiterals": false,
           // Removes duplicate code blocks
           "deduplicate": false,
           // Common subexpression elimination, this is the most complicated step but
           // can also provide the largest gain.
           "cse": false,
           // Optimize representation of literal numbers and strings in code.
           "constantOptimizer": false,
           // The new Yul optimizer. Mostly operates on the code of ABIEncoderV2
           // and inline assembly.
           // It is activated together with the global optimizer setting
           // and can be deactivated here.
           // Before Solidity 0.6.0 it had to be activated through this switch.
           "yul": true,
           // Tuning options for the Yul optimizer.
           "yulDetails": {
              // Improve allocation of stack slots for variables, can free up stack slots early.
              // Activated by default if the Yul optimizer is activated.
              "stackAllocation": true
            }
          }*/
        },
        evmVersion: "istanbul"
      }
    }
  }
}

if (endpoints) {

  // Injecting endpoints
  Object.keys(endpoints).forEach((name) => {
    if (!config.networks[name]) {
      let template = {
        network_id: 9999,       // Goerli's id
        gas: 5500000,        // Goerli has a lower block limit than mainnet
        confirmations: 2,    // # of confs to wait between deployments. (default: 0)
        timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
        skipDryRun: true     // Skip dry run before migrations? (default: false for public nets )
      };
      Object.keys(config.networks).forEach((existingNetworkName) => {
        if (name.startsWith(existingNetworkName)) {
          template = config.networks[existingNetworkName];
        }
      });
      template.provider = 
        () => new HDWalletProvider(mnemonic, endpoints[name], 0, 5),
      config.networks[name] = template;
    }
  });
}

module.exports = config;
