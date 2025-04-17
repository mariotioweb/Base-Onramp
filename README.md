# Base-Onramp

Implemented Coinbase OnRamp following the instuction available here:

https://docs.cdp.coinbase.com/onramp/docs/api-onramp-initializing

Creating the url for payment we don't pass any data about the currency to use to avoid errors in Coinbase procedure that a NO USD/EUR user could receive inside the Coinbase popup page.

The implemented solution check the response of Topup procedure checking the wallet balance. 
In case of balance increase it will return back to the checkout modal page to allow the purchase with the web3 wallet and go on with all the others utilities (escrow, selling, etc.).

ATTENTION: Coinbase OnRamp is NOT offering any Sandbox and doesn't work in Testnet!
So in testnet too user can buy with a real credit card and get only crypto in mainnet (ETH or BASE, etc)
