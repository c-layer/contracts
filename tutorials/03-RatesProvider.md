
# Rates Provider

### Requirements

Your environment is setup as described [here](https://github.com/c-layer/contracts/blob/tutorials/tutorials/Tutorials.md#requirements).

### Goals

This tutorial will guide you to deploy a rates provider and learn how to manage it.

### Start

You must start `truffle` from the c-layer-oracle module
```bash
  cd c-layer-oracle && truffle develop
```

### Steps

##### 1- Create a rates provider
```javascript
rates = await RatesProvider.new("My Rates Oracle")
rates.address
```

If your rate contract was created correctly the previous command would have displayed your contract address
If you are on a live network, you might want to backup this address for later use.

The rates provider is configured with default currencies :
```javascript
rates.currencies().then((result) => result[0].map((currency, i) => web3.utils.toAscii(currency).substr(0, 3)))
```

And their decimals:
```javascript
rates.currencies().then((result) => result[1].map((decimals, i) => decimals.toString()))
```

The order in which the rates are defined is important.
The first currency (ETH by default) will be the counter currency against which all rates are defined.

```javascript
rates.rates().then((result) => result[1].map((x) => x.toString()))
```

You may also look at the different methods available
```javascript
Object.keys(rates.methods)
```

##### 2- Updates new rates

As solidity does not support float precision, the rates are not stored directly.
First a conversion must be done on client side to obtain an `uint256` compatible value.
The conversion will be done in the lowest units of each currency (cents, wei, satoshi, ...).

With a ETHBTC at 0.0199 and ETHUSD at 141.31.
ETH has 18 decimals
BTC has 8 decimals
USD has 2 decimals

```javascript
ETHBTC = Math.floor(10**18 / 0.0199) + "".padEnd(18 - 8, "0")
ETHUSD = Math.floor(10**18 / 141.31) + "".padEnd(18 - 2, "0")
```
To simplify the javascript command as decimals are not well supported, the 18th last decimals have been truncated but to increase precision. However, it is recommended to use all decimals in production with using big number libraries.

Then, it is only needed to defines the rates as below. The parameter is an array of rates in the same order as currencies definition seen above (```rates.currencies()```).
```javascript
rates.defineRatesExternal([ ETHBTC, 0, 0, ETHUSD ])
```

Accessing the rates can be done per currency
```javascript
rates.rate(web3.utils.fromAscii("BTC")).then(x => Math.round(10**(36-8) / x))
rates.rate(web3.utils.fromAscii("USD")).then(x => Math.round(10**(36-2) / x))
```

It is also possible to check when the rates were updated:
```javascript
rates.rates().then((result) => new Date(result[0] * 1000))
```

##### 3- Look at historical rates

Let's add another ETHBTC and ETHUSD rates:
```javascript
ETHBTC = Math.floor(10**18 / 0.0180) + "".padEnd(18 - 8, "0")
ETHUSD = Math.floor(10**18 / 130.80) + "".padEnd(18 - 2, "0")
rates.defineRatesExternal([ ETHBTC, 0, 0, ETHUSD ])
```

Now, we can retrieve the rates history for BTC
```javascript
rates.getPastEvents("Rate", { topics: [ null, web3.utils.toHex("BTC").padEnd(66, "0") ] }, { fromBlock: 0, toBlock: 10000 }).then((x) => x.map((y) => (y.args.rate.toString() == "0") ? "0" : 10**(36-8) / y.args.rate))
```
If you are on a live network, you must use select a reasonnable block intervale (for example within the latest 10000).

##### 4- Define different currencies
It is also possible to define different currencies.

```javascript
rates.defineCurrencies([ web3.utils.fromAscii("ETH"), web3.utils.fromAscii("MTK") ], [ 18, 18 ], 1)
```
You may ignore the last parameter for now.
The first currency (ie ETH here) will be the counter currency.

```javascript
rates.currencies().then((result) => result[0].map((currency, i) => web3.utils.toAscii(currency).substr(0, 3)))
```


