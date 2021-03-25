
# Rates Provider

### Requirements

Your environment is setup as described [here](./Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a rates provider and learn how to manage it.

### Start

##### 1- Go into the oracle module and start truffle
```bash
cd oracle && yarn develop
```

##### 2- Load definitions

You shall to load the definitions needed for this tutorial:

```javascript
accounts = await web3.eth.getAccounts()

RatesProvider = await artifacts.require('RatesProvider')
```

### Steps

##### 3- Create a rates provider
```javascript
rates = await RatesProvider.new("My Rates Oracle")
rates.address
```

If your rate contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

The rates provider is configured with default currencies :
```javascript
await rates.currencies().then((result) => result[0].map((currency, i) => web3.utils.toAscii(currency).substr(0, 3)))
```

And their decimals:
```javascript
await rates.currencies().then((result) => result[1].map((decimals, i) => decimals.toString()))
```

The order in which the rates are defined is important.
The first currency (ETH by default) will be the counter currency against which all rates are defined.

```javascript
await rates.rates().then((result) => result[1].map((val) => val.toString()))
```

You may also look at the different methods available
```javascript
Object.keys(rates.methods)
```

##### 4- Updates new rates

As Solidity does not support float precision, the rates are not stored directly.
First a conversion must be done on client side to obtain an `uint256` compatible value.
The conversion will be done in the lowest units of each currency (cents, wei, satoshi, ...).

With a ETHBTC at 0.0199 and ETHUSD at 141.3142.
ETH has 18 decimals
BTC has 8 decimals
USD has 2 decimals

```javascript
ETHBTC = Math.floor(10**18 / 0.0199) + "".padEnd(18 - 8, "0")
ETHUSD = Math.floor(10**18 / 141.3142) + "".padEnd(18 - 2, "0")
```
Because decimals are not well supported in javascript, the last decimals following the 18th have been truncated.
However, to increase precision it is recommended to keep all decimals in production by using big number libraries.

The parameter in the command below is an array of rates in the same order as the currencies displayed by (`rates.currencies()`).
```javascript
await rates.defineRatesExternal([ ETHBTC, 0, 0, ETHUSD ])
```

Accessing the rates can be done per currency
```javascript
await rates.rate(web3.utils.fromAscii("BTC")).then(x => Math.round(10**(18+18-8+4) / x)/10**4)
await rates.rate(web3.utils.fromAscii("USD")).then(x => Math.round(10**(18+18-2+4) / x)/10**4)
```

It is also possible to check when the rates were updated:
```javascript
await rates.rates().then((result) => new Date(result[0] * 1000))
```

##### 5- Look at historical rates

Let's add another ETHBTC and ETHUSD rates:
```javascript
ETHBTC = Math.floor(10**18 / 0.0188) + "".padEnd(18 - 8, "0")
ETHUSD = Math.floor(10**18 / 130.8080) + "".padEnd(18 - 2, "0")
await rates.defineRatesExternal([ ETHBTC, 0, 0, ETHUSD ])
```

Now, we can retrieve the rates history for BTC
```javascript
await rates.getPastEvents("Rate", { topics: [ null, web3.utils.toHex("BTC").padEnd(66, "0") ], fromBlock: 0, toBlock: 10000 }).then((x) => x.map((y) => (y.args.rate.toString() == "0") ? "0.0000" : (10**(18+18-8) / y.args.rate).toFixed(4)))
```
If you are on a live network, you must use select a reasonnable block intervale (for example within the latest 10000).

##### 6- Define different currencies
It is also possible to define different currencies.

```javascript
await rates.defineCurrencies([ web3.utils.fromAscii("ETH"), web3.utils.fromAscii("MTK") ], [ 18, 18 ], 1)
```
You may ignore the last parameter for now.
The first currency (ie ETH here) will be the counter currency.

```javascript
await rates.currencies().then((result) => result[0].map((currency, i) => web3.utils.toAscii(currency).substr(0, 3)))
```
