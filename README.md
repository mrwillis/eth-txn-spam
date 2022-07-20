# txn-spam 
This is a stress test script you can run against v3. It will spam various kinds of transactions from multiple base mnemonics and all their child accounts.

Ensure you have at least 12 cores if you want to spam from more than 3-4 base mnemonics at once. Ideally 16 cores, otherwise your machine will be the limiting factor and you might not spam as many transactions as you would hope for. 

# Setup

[Optional]:
    Make a file `mnemonics` in this repo and populate it with 12 word mnemonics, one for each line. Fund the base accounts for each mnemonic  with a bunch of ETH. You can use https://iancoleman.io/bip39/ to generate mnemonics and derive the base account. 

`$ ./init.sh` - initializes and/or starts v3 instances before we can do actual spamming
  - `$ ./init.sh --help` to see all the commands and options
  - `$ ./init.sh setup` creates main spam account, validator accounts and config.json.
  - `$ ./init.sh docker` creates docker image and deploys smart contract to v3 instance

`config.json` is a configuration for txn spam. By default it is saved to the `~/borv3` directory. it has properties:
  - `privateKey` private key for main txn spam account
  - `spamContractAddress` address of smart contract used for modes 1 and 2
  - `rpcUrl` rpc url of v3 instance we want to spam

# Usage

Run script with four arguments

`$ ./start.sh 2 100 0` starts actual test

- `RPC_URL` is the RPC URL of the node you wish to target
- `PARALLELISM` is the amount of individual processes you want to run
- `RANGE` is how many derivations (sub accounts) of each mnemonic you want to use at a time. Essentially another parallelism parameter. For example, a range of 10 means that for each mnemonic, 10 child accounts will be sending transactions in parallel. *The transactions do not wait for the previous one to finish, they simply increase the nonce for the next one in line, greatly improving the speed*.
- `MODE` is the type of transaction you wish to send. Follow modes are supported:
  - 0 is regular transfer (default if not passed)
  - 1 approximates ERC20 approval or ERC20 transfer (~100k gas)
  - 2 is a complex transaction (~250k gas)
  - 3 is a contract deploy (~600k gas)

You shouldn't have to top up the gas frequently as it is hard-coded to send all transactions with 1 gwei. Moreover, mode 0 essentially just sends money back and forth between accounts. 

*Note that there is some startup time for the script to distribute $ if necessary to its sub accounts*

Stopping:

`$ ./stop.sh`

# Without docker
`$ npm run compile && env RANGE=100 MODE=0 node ./dist/index.js`





