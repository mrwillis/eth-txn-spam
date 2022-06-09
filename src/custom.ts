import { Wallet, ContractFactory, BigNumber, utils } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";
import { parseUnits, parseEther } from "ethers/lib/utils";
import Greeter from "./Greeter.json";
import fs from "fs";
import { join as pathJoin } from "path";
import { exec as execProcess } from "child_process";
import util from "util";

export interface IMainWalletActions {
    initialContractDeploy(gasPrice?: BigNumber): Promise<string>;
    distributeNativeCurrencyIfNecessary(gasPrice?: BigNumber | undefined): Promise<boolean>;
    getBalances(): Promise<[Wallet, BigNumber][]>;
    execute(fn: (_: Wallet) => Promise<void>): Promise<boolean[]>;
    executeTwo(fn: (_: Wallet, __: Wallet) => Promise<void>): Promise<boolean[]>;
}

export function makeWallets(privateKeyMainWallet: string, rpcUrl: string, range: number, mnemonicp?: string)
    : IMainWalletActions {
    const mnemonic = mnemonicp || utils.entropyToMnemonic(utils.randomBytes(32)); // generate random mnemonic if not provided
    if (privateKeyMainWallet.startsWith("0x")) {  // remove hexa prefix if needed
        privateKeyMainWallet = privateKeyMainWallet.substring(2)
    }
    const provider = new JsonRpcProvider(rpcUrl);    
    const sendingWallet = new Wallet(privateKeyMainWallet).connect(provider);
    const wallets: Wallet[] = Array.from(Array(range).keys()).map(index => {        
        const recipient = Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`).connect(provider);
        return recipient;
    });            
    
    return {
        initialContractDeploy: async function (gasPrice?: BigNumber): Promise<string> {
            const gasLimit = 500_000;
            const nonce = await sendingWallet.getTransactionCount();
            
            console.log(`Deploying Initial Greeter contract with account ${sendingWallet.address}, nonce: ${nonce}, gasLimit = ${gasLimit}, gasPrice = ${gasPrice}`);
            const factory = new ContractFactory(Greeter.abi, Greeter.bytecode, sendingWallet);                        
            const contract = await factory.deploy({
                nonce,
                gasLimit: gasLimit,
                gasPrice: gasPrice || parseUnits("1", "gwei"),
            });

            return contract.address
        },
        
        distributeNativeCurrencyIfNecessary: async function (gasPrice?: BigNumber): Promise<boolean> {
            const gasLimit = 100_000;
            const minimumBalance = parseEther("10");
            
            const sendTxIfNeeded = async function (recipient: Wallet, amount: BigNumber, nonce: number): Promise<boolean> {
                try {
                    const data = {
                        value: amount,
                        to: recipient.address,
                        gasLimit: gasLimit,
                        gasPrice: gasPrice || parseUnits("10", "gwei"),
                        nonce,
                    };
                    console.log(`Sending raw transaction to ${recipient.address}: value = ${data.value.toString()}, gasLimit= ${data.gasLimit}, gasPrice = ${data.gasPrice.toString()}, nonce = ${data.nonce}`);
                    await sendingWallet.sendTransaction(data);
                    return true;
                } catch (err) {
                    console.log(`Recipient ${recipient.address} error: ${err}`);
                    return false;
                }                
            }

            const sendingWalletBalance = await provider.getBalance(sendingWallet.address);      
            let distributionAmount = sendingWalletBalance.div(range);
            if (distributionAmount.gt(minimumBalance)) {
                distributionAmount = minimumBalance;
            }

            console.log(`Sending wallet address: ${sendingWallet.address}, balance: ${sendingWalletBalance.toString()}, sending: ${distributionAmount.toString()}`);
            if (sendingWalletBalance.isZero()) {
                return false;
            }
            
            const nonceStarting = await sendingWallet.getTransactionCount();
            const balances = await this.getBalances();
            
            const promiseCalls: Promise<boolean>[] = balances
                .filter(([_, balance]) => balance.lt(minimumBalance)) // only send matics to wallets with less than minimumBalance balance 
                .map(([wallet, _], index) => sendTxIfNeeded(wallet, distributionAmount, nonceStarting + index));
            const results = await Promise.all(promiseCalls);
            return results.some(x => x);
        },

        getBalances: async function (): Promise<[Wallet, BigNumber][]> {
            const promiseCalls: Promise<BigNumber>[] = wallets.map(recipient => {
                return recipient.getBalance();
            });
            const balances = await Promise.all(promiseCalls);
            return balances.map((balance, index) => [wallets[index], balance]);
        },

        execute: function(fn: (_: Wallet) => Promise<void>): Promise<boolean[]> {
            return Promise.all(wallets.map(async (wallet) => {
                try {
                    await fn(wallet);
                    return true;
                } catch (err) {
                    console.log(`Error for account ${wallet.address}: ${err}`);
                    return false;
                }
            }));
        },
        executeTwo: function(fn: (_: Wallet, __: Wallet) => Promise<void>): Promise<boolean[]> {
            return Promise.all(wallets.map(async (wallet, index) => {
                try {
                    await fn(wallet, wallets[(index + 1) % wallets.length]);
                    return true;
                } catch (err) {
                    console.log(`Error for account ${wallet.address}: ${err}`);
                    return false;
                }
            }));
        }
    }
}

type ConfigData = {
    privateKey: string;
    spamContractAddress: string;
    rpcUrl: string;
};

export const Config = {
    data: { privateKey: "", spamContractAddress: "", rpcUrl: "" } as ConfigData,
    fromString: function (str: string) {
        this.data = JSON.parse(str) as ConfigData;
    },
    load: function(path: string) {
        const fpath = pathJoin(resolveHome(path), 'config.json');
        if (!fs.existsSync(fpath)) {
            throw `Config file does not exist: ${fpath}`;
        }
        const buffer = fs.readFileSync(fpath);
        const js = JSON.parse(buffer.toString());
        this.data = js as ConfigData;
    },
    save: function(path: string) {
        path = resolveHome(path)
        if (!fs.existsSync(path)){
            fs.mkdirSync(path, { recursive: true });
        }        
        
        const data = JSON.stringify(this.data)
        const fpath = pathJoin(path, 'config.json');
        fs.writeFileSync(fpath, data);
    },
    init: function(pk: string, address: string, rpcUrl: string) {
        this.data = { privateKey: pk, spamContractAddress: address, rpcUrl: rpcUrl };
        return this;
    },
    setAddress: function(address: string) {
        this.data.spamContractAddress = address;
        return this;
    },
    setRpcUrl: function(rpcUrl: string) {
        this.data.rpcUrl = rpcUrl;
        return this;
    }
}

export const sleep = function(time: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
}

export const startcmd = async function(cmd: string): Promise<[boolean, string, string]> {
    const exec = util.promisify(execProcess); // i.e. can then await for promisified exec call to complete    
    try {
        const { stdout, stderr } = await exec(cmd);
        return [true, stdout, stderr];
    } catch {
        return [false, "", ""];
    }
}

export const resolveHome = function (filepath: string): string {
    if (!filepath || filepath[0] !== '~') {
        return filepath
    }
    return pathJoin(process.env.HOME!, filepath.slice(1));
}

export const getGasPrice = function(rpcUrl: string): Promise<BigNumber> {
    const provider = new JsonRpcProvider(rpcUrl)    
    return provider.getGasPrice();
}