# txn-spam 

This is a stress test script you can run against EVM-compatible nodes (geth, polygon-sdk, parity). It will spam various kinds of transactions from multiple base mnemonics and all their child accounts.

Ensure you have at least 12 cores if you want to spam from more than 3-4 base mnemonics at once. Ideally 16 cores, otherwise your machine will be the limiting factor and you might not spam as many transactions as you would hope for. 


# Setup

Build image if not already:

`docker build . -t txn-spam`

Deploy `Greeter.json` onto your chain and set that address in `spamContractAddress` in `index.ts`

Make a file `mnemonics` in this repo and populate it with 12 word mnemonics, one for each line. Fund the base accounts for each mnemonic with a bunch of ETH. You can use https://iancoleman.io/bip39/ to generate mnemonics and derive the base account. 

The script will top up the child accounts to 10 ETH if they are under it, so make sure the base accounts have at least `10 ETH * RANGE` (see below) on your first run.

# Usage

Run script with four arguments

`bash start.sh [RPC_URL] [PARALLELISM] [RANGE] [MODE]`

- `RPC_URL` is the RPC URL of the node you wish to target
- `PARALLELISM` is the amount of individual processes you want to run
- `RANGE` is how many derivations (sub accounts) of each mnemonic you want to use at a time. Essentially another parallelism parameter. For example, a range of 10 means that for each mnemonic, 10 child accounts will be sending transactions in parallel. *The transactions do not wait for the previous one to finish, they simply increase the nonce for the next one in line, greatly improving the speed*.
- `MODE` is the type of transaction you wish to send. Follow modes are supported:
  - 0 is regular transfer (default if not passed)
  - 1 approximates ERC20 approval or ERC20 transfer (~100k gas)
  - 2 is a complex transaction (~250k gas)
  - 3 is a contract deploy (~600k gas)

You shouldn't have to top up the gas frequently as it is hard-coded to send all transactions with 1 gwei. Moreover, mode 0 essentially just sends money back and forth between accounts. 

Starting

`bash start.sh https://rpc.toronto.sx.technology 2 100 0`

*Note that there is some startup time for the script to distribute $ if necessary to its sub accounts*

Stopping:

`bash stop.sh`




