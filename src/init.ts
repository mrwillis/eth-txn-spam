import { Wallet } from "ethers";
import { Config, startcmd, makeWallets, resolveHome, getGasPrice } from "./custom";
import { join as pathJoin } from "path";
import { rmSync, readdirSync, mkdirSync, existsSync } from "fs";
import { chdir as changeDirectory, cwd as currentWorkingDirectory } from "process";
import { Command , InvalidArgumentError } from "commander";
import { parseEther } from "ethers/lib/utils";

const borv3PortBase: number = 30300; // ports in genesis.json are currently hardcoded. +1 for each validator

function createAccount() {
    const wallet = Wallet.createRandom();
    Config.init(wallet.privateKey, "", "").save();
    console.log("address: " +wallet.address);
}

async function createAccountAndInitBor(borPath: string, options: any) {
    borPath = resolveHome(borPath);
    const premineAmount = parseEther(1_000_000 + '').toHexString()  // amount of matics we want to premine
    const dataDirPath = resolveHome(options.dataDirPath);
    const dataDirWithPrefix = pathJoin(dataDirPath, options.dataDirName);
    const initAccountCmdTemp = 'go run cmd/borv3/main.go init-account --datadir $DATADIR_WITH_PREFIX$ --num $VALIDATORCOUNT$';
    const initGenesisCmdTemp = 'go run cmd/borv3/main.go init-genesis --output $DATADIR$ --prefix $PREFIX$ --premine $PREMINE$';
    
    const wallet = Wallet.createRandom();
    Config.init(wallet.privateKey, "", "").save();
    const premineAddress = wallet.address

    // remove old data dir directory
    if (existsSync(dataDirPath)) {
        console.log(`Removing old data dir ("${dataDirPath}") directory...`);
        rmSync(dataDirPath, { recursive: true });
    }
    
    const initialDirectory = currentWorkingDirectory();
    
    // init accounts
    changeDirectory(borPath);
    const initAccountCmd = initAccountCmdTemp
        .replace('$DATADIR_WITH_PREFIX$', dataDirWithPrefix)
        .replace('$VALIDATORCOUNT$', options.validatorCnt)
    console.log(`Executing ${initAccountCmd}`);
    const [isOk1, stdout1, _] = await startcmd(initAccountCmd);
    if (!isOk1) {
        console.log('Failed to execute init-account');
        return;
    } else {
        console.log(stdout1);
    }
    // generate genesis
    const initGenesisCmd = initGenesisCmdTemp
        .replace('$DATADIR$', dataDirPath)
        .replace('$PREFIX$', options.dataDirName)
        .replace('$PREMINE$', `${premineAddress}:${premineAmount}`);
    console.log(`Executing ${initGenesisCmd}`);
    const [isOk2, stdout2, __] = await startcmd(initGenesisCmd);
    if (!isOk2) {
        console.log('Failed to execute init-genesis');
    } else {
        console.log(stdout2);
    }

    changeDirectory(initialDirectory);
}

async function setupTxmSpam() {
    // deploy contract
    console.log('Deploy contract...');    
    Config.load();
    const wallets = makeWallets(Config.data.privateKey, Config.data.rpcUrl, "", 0);
    
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

async function startBors(borPath: string, options: any) {
    borPath = resolveHome(borPath);
    const logPath = resolveHome(options.logPath || '');
    const dataDirPath = resolveHome(options.dataDirPath);
    const genesisPath = pathJoin(dataDirPath, "genesis.json");
    const dataDirWithPrefix = pathJoin(dataDirPath, options.dataDirName);
    const borCmdTemp = 'go run cmd/borv3/main.go server --chain $GENESIS$ --datadir $DATADIR_PATH$ --port $PORT$ --mine';
    const borCmdFullTemp = `${borCmdTemp} --jsonrpc.modules eth --http --http.addr localhost --http.port $HTTP_PORT$`;

    Config.load();
    Config.setRpcUrl(`http://localhost:${options.rpcPort}`).save();

    const initialDirectory = currentWorkingDirectory();

    const processCount = readdirSync(dataDirPath).filter(x => x.startsWith(options.dataDirName)).length;
    if (processCount < 1) {
        console.log(`There are no accounts in ${dataDirPath}`);
        return;
    }

    changeDirectory(borPath);
    if (logPath && !existsSync(logPath)) {
        mkdirSync(logPath);
    }

    const borCommands: string[] = []
    let mainBorCmd = borCmdFullTemp
        .replace('$GENESIS$', genesisPath)
        .replace('$PORT$', (borv3PortBase + 1).toString())
        .replace('$HTTP_PORT$', options.rpcPort)
        .replace('$DATADIR_PATH$', dataDirWithPrefix + '1');
    if (logPath) {
        mainBorCmd = `${mainBorCmd} > ${pathJoin(logPath, '1.log')}`;
    }
    borCommands.push(mainBorCmd);
    for (let i = 2; i <= processCount; i++) {
        let cmd = borCmdTemp
            .replace('$GENESIS$', genesisPath)
            .replace('$PORT$', (borv3PortBase + i).toString())
            .replace('$DATADIR_PATH$', dataDirWithPrefix + i);
        if (logPath) {
            cmd = `${cmd} > ${pathJoin(logPath, i + '.log')}`;
        }
        borCommands.push(cmd);
    }
    console.log('Executing:\n' + borCommands.join('\n'));
    const results = await Promise.all(borCommands.map(x => startcmd(x)));
    for (let i = 0; i < results.length; i++) {
        if (!results[i][0]) {
            console.log(`bor number ${i + 1} failed`);
        }
    }
    changeDirectory(initialDirectory);
}

function myParseInt(value: string, _: any): number {
    const parsedValue = parseInt(value, 10); // parseInt takes a string and a radix
    if (isNaN(parsedValue)) throw new InvalidArgumentError('Not a number.');
    return parsedValue;
}

const program = new Command();

program
  .name('init-txm-spam')
  .description('txm spam bor v3 initialization util')
  .version('0.8.0');

program.command('create-account')
  .description('create account and initial config.json')
  .action(() => createAccount())

program.command('setup-bor <bor-path>')
  .description('setup bor: create accounts, initialize genesis file, premine address')
  .option('-d, --data-dir-path <data-dir-path>', 'data dir path', '~/borv3')
  .option('-n, --data-dir-name <data-dir-name>', 'data dir name', 'test-dir-')
  .option<number>('-c, --validator-cnt <validator-cnt>', 'count of validators', myParseInt, 5)
  .action((borPath, options) => createAccountAndInitBor(borPath, options)
                                  .then(() => console.log("Done"))
                                  .catch((err) => console.error(err)));

program.command('start-bor <bor-path>')
  .description('start n instances of a bor')
  .option('-d, --data-dir-path <data-dir-path>', 'data dir path', '~/borv3')
  .option('-n, --data-dir-name <data-dir-name>', 'data dir name', 'test-dir-')
  .option<number>('-rpc, --rpc-port <rpc-port>', 'port for rpc', myParseInt, 12001)
  // .option<number>('-p, --port <port>', 'port', myParseInt, 3000)
  .option('-l, --log-path <log-path>', 'log name', '')
  .action((borPath, options) => startBors(borPath, options)
                                  .then(() => console.log("Done"))
                                  .catch((err) => console.error(err)));

program.command('setup-txm')
    .description('setup txm spam')
    .action(() => setupTxmSpam()
                  .then(() => console.log("Done"))
                  .catch((err) => console.error(err)));

program.parse();
