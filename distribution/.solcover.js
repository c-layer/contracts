module.exports = {
  norpc: true,
  testCommand: 'node --max-old-space-size=4096 /home/node/.yarn-global/bin/truffle test --network coverage',
  compileCommand: 'node --max-old-space-size=4096 /home/node/.yarn-global/bin/truffle compile --network coverage',
  skipFiles: [ 
    'mock',
  ],
  mocha: {
    grep: "@skip-on-coverage", // Find everything with this tag
    invert: true               // Run the grep's inverse set.
  }
}
