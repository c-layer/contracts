module.exports = {
  norpc: true,
  testCommand: 'node --max-old-space-size=4096 /home/node/.yarn-global/bin/truffle test --network coverage',
  compileCommand: 'node --max-old-space-size=4096 /home/node/.yarn-global/bin/truffle compile --network coverage',
  skipFiles: [ 
    'mock',
  ]
}
