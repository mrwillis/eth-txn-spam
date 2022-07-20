import { Wallet } from "ethers";
import { Config, startcmd, makeWallets, getGasPrice } from "./custom";
import { Command , InvalidArgumentError } from "commander";

const borv3PortBase: number = 30300; // ports in genesis.json are currently hardcoded. +1 for each validator

function showAccountAddress(options: any) {
    Config.load();
    const wallet = new Wallet(Config.data.privateKey)
    console.log("Wallet address: " + wallet.address);
}

async function setup(options: any) {
    const wallet = Wallet.createRandom();
    Config.init(wallet.privateKey, "", options.rpcUrl).save();
    const premineAddress = wallet.address
    console.log('Config file created: config.json');
    console.log("You can now premine or fund this account with at least 0xd3c21bcecceda1000000: " + premineAddress);
    console.log("After that, you can deploy the contract and build the docker image: ./init.sh docker");
}

async function docker(options: any) {
    // deploy contract
    console.log('Deploy contract...');    
    Config.load();
    const wallets = makeWallets(Config.data.privateKey, Config.data.rpcUrl, 0, "nonsense");
    
    const gasPrice = await getGasPrice(Config.data.rpcUrl);    
    const contractAddress = await wallets.initialContractDeploy(gasPrice);
    Config.setAddress(contractAddress).save();

    // removing docker image
    console.log('Removing old docker image....')
    await startcmd('docker image rm txn-spam');
    
    // create docker image
    console.log('Building docker....')
    const [ok, stdout, _] = await startcmd('docker build . -t txn-spam')
    if (!ok) {
        console.log('Failed to build docker image');
    } else {
        console.log(stdout);
    }
}

function myParseInt(value: string, _: any): number {
    const parsedValue = parseInt(value, 10); // parseInt takes a string and a radix
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.');
    return parsedValue;
}

const program = new Command();

program
  .name('v3-txn-spam-init')
  .description('v3 txn spam initialization util')
  .version('0.8.1');

program.command('show-account-address')
  .description('prints main account address')
  .option('-c, --config-path <config-path>', 'config path', '~/borv3')
  .action(options => showAccountAddress(options))

program.command('setup')
  .description('creates main spam account and validator accounts and config.json.')
    .option('-r, --rpc-url <rpc-url>', 'rpc url', 'http://localhost:8545')
  .action((options) => setup(options)
                                  .then(() => console.log("Done"))
                                  .catch((err) => console.error(err)));

program.command('docker')
    .description('creates docker image and deploys smart contract to v3 instance')
    .option('-c, --config-path <config-path>', 'config path', '~/borv3')
    .action(options => docker(options)
                  .then(() => console.log("Done"))
                  .catch((err) => console.error(err)));

program.parse();
