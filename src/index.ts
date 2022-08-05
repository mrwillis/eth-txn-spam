import { makeWallets, sleep, getGasPrice, Config } from "./custom";
import { basicTransferLoop } from "./modes/basic_transfer";
import { complexTransactionLoop } from "./modes/complex_transaction";
import { contractDeployLoop } from "./modes/contract_deploy";
import { erc20TransferLoop } from "./modes/erc20_transfer";
import { Mode } from "./types";

const WaitForBlockInMs = (1000 * 30).toString();

async function main() {  
    const mnemonic = process.env.MNEMONIC;
    const configDataJson = process.env.CONFIG_DATA_JSON;
    const configDataPath = process.env.CONFIG_DATA_PATH;
    if (!process.env.RANGE) throw 'RANGE not defined!';
    if (!configDataJson && !configDataPath) throw 'CONFIG_DATA_JSON or CONFIG_DATA_PATH not defined'
    
    const mode = parseMode(process.env.MODE || '0');
    const intRange = parseInt(process.env.RANGE || '0', 10);
    const waitForBlock = parseInt(process.env.WAIT_FOR_BLOCK || WaitForBlockInMs, 10);
    
    if (!!configDataJson) {
        Config.fromString(configDataJson!);
    } else {
        Config.load();
    }
    
    const rpcUrl = Config.data.rpcUrl;
    console.log('Mode: ' + mode);
    console.log('RPC url: ' + rpcUrl);
    console.log('Spammers count: ' + intRange);
    const wallets = makeWallets(Config.data.privateKey, rpcUrl, intRange, mnemonic);
    const gasPrice = await getGasPrice(rpcUrl);
    
    let hasChanges = false;
    let spamContractAddress = Config.data.spamContractAddress;

    if (doesModeNeedContract(mode) && !spamContractAddress) {
        // deploy contract if not deployed and it is needed
        spamContractAddress = await wallets.initialContractDeploy(gasPrice);
        console.log('Contract deployed: ' + spamContractAddress);
        hasChanges = true;
    }
    
    if (hasChanges) {
        console.log('Sleep some time in order to wait for transactions to be included in block')
        await sleep(waitForBlock);
    }

    const walletsUpdated = await wallets.distributeNativeCurrencyIfNecessary(gasPrice)
    hasChanges ||= walletsUpdated;
    
    if (hasChanges) {
        console.log('Sleep some time in order to wait for transactions to be included in block')
        await sleep(waitForBlock);
    }

    const balances = await wallets.getBalances()
    console.log('Account balances: ', balances.map(([wallet, balance]) => `${wallet.address}: ${balance}`).join(', '));
    
    switch (mode) {
        case Mode.Transfer:
            await wallets.executeTwo((wallet, recipient) => basicTransferLoop(wallet, recipient, gasPrice));
            break;
        case Mode.ERC20:
            await wallets.execute(wallet => erc20TransferLoop(wallet, spamContractAddress, gasPrice));
            break;
        case Mode.Complex:
            await wallets.execute(wallet => complexTransactionLoop(wallet, spamContractAddress, gasPrice));
            break;
        case Mode.Deploy:
            await wallets.execute(wallet => contractDeployLoop(wallet, gasPrice));
            break;
    }
}

function parseMode(mode: string): Mode {
    const parsedMode = parseInt(mode, 10);
    switch (parsedMode) {
        case Mode.Transfer: case Mode.ERC20: case Mode.Deploy: case Mode.Complex:
            return parsedMode
        default:
            throw new Error(`Unknown mode! Raw: ${mode}. Parsed: ${parsedMode}`);
    }
}

function doesModeNeedContract(mode: Mode): boolean {
    return mode == Mode.ERC20 || mode == Mode.Complex;
}

main()
    .then(() => console.log("Done"))
    .catch((err) => console.error(err));
