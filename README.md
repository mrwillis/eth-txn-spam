# txn-spam 
This is a stress test script you can run against borv3. It will spam various kinds of transactions from multiple base mnemonics and all their child accounts.

Ensure you have at least 12 cores if you want to spam from more than 3-4 base mnemonics at once. Ideally 16 cores, otherwise your machine will be the limiting factor and you might not spam as many transactions as you would hope for. 


# Setup

[Optional]:
    - Make a file `mnemonics` in this repo and populate it with 12 word mnemonics, one for each line. Fund the base accounts for each mnemonic  with a bunch of ETH. You can use https://iancoleman.io/bip39/ to generate mnemonics and derive the base account. 

All the actions are done with three bash scripts `init.sh`, `start.sh` and `stop.sh`:
  - `init.sh` - initializes and/or starts bor instances before we can do actual spamming
      Execute `$ ./init.sh` to see all the commands and options from this init tool
      Basic/necessary commands are:
        `$ ./init.sh setup-bor <bor-path>` initialize account and genesis (by default) into `~/borv3/test-dir-`
        `$ ./init.sh start-bor <bor-path>` starts bor instances (by default 5). Run this command in separate cmd. Close all instances with ctrl+C
            `$ ./init.sh start-bor <bor-path> -l <log-path>` like the command above but also logs into `log-path` directory.
        `$ ./init.sh setup-txn` builds docker, upload contract

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

`bash stop.sh`

# Without docker
`$ npm run compile && env RANGE=100 MODE=0 CONFIG_DATA_PATH=~/borv3 node ./dist/index.js`





