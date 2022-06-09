import { makeWallets, executeInRange, sleep, getGasPrice } from "./custom";
import { basicTransferLoop } from "./modes/basic_transfer";
import { complexTransactionLoop } from "./modes/complex_transaction";
import { contractDeployLoop } from "./modes/contract_deploy";
import { erc20TransferLoop } from "./modes/erc20_transfer";
import { Mode } from "./types";
import * as Config from "./config.json"
import { formatEther } from "ethers/lib/utils";

const WaitForBlockInMs = (1000 * 30).toString();

async function main() {  
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) throw 'MNEMONIC not defined!';
  if (!process.env.RANGE) throw 'RANGE not defined!';

  const mode = parseMode(process.env.MODE || '0');
  const intRange = parseInt(process.env.RANGE || '0', 10);
  const waitForBlock = parseInt(process.env.WAIT_FOR_BLOCK || WaitForBlockInMs, 10);
  
  const wallets = makeWallets(Config.privateKey, Config.rpcUrl, mnemonic!, intRange);
  const gasPrice = await getGasPrice(Config.rpcUrl);
  
  let spamContractAddress = Config.spamContractAddress;
  // deploy contract if not deployed
  if (!spamContractAddress) {
      spamContractAddress = await wallets.initialContractDeploy(gasPrice);
  }

  const hasChange = await wallets.distributeNativeCurrencyIfNecessary(gasPrice)
  
  if (!Config.spamContractAddress || hasChange) {
      console.log('Sleep some time in order to wait for transactions to be included in block')
      await sleep(waitForBlock);
  }

  const balances = await wallets.getBalances()
  console.log('Account balances: ', balances.map(([wallet, balance]) => `${wallet.address}: ${formatEther(balance)}`).join(', '));
  
  switch (mode) {
    case Mode.Transfer:
      await executeInRange(intRange, val => basicTransferLoop(mnemonic, val, Config.rpcUrl, intRange, gasPrice));
      break;
    case Mode.ERC20:
      await executeInRange(intRange, val => 
        erc20TransferLoop(
          mnemonic,
          val,
          Config.rpcUrl,
          spamContractAddress,
          gasPrice,
        )
      );
      break;
    case Mode.Complex:
      await executeInRange(intRange, val => 
        complexTransactionLoop(
          mnemonic,
          val,
          Config.rpcUrl,
          spamContractAddress,
          gasPrice,
        )
      );
      break;
    case Mode.Deploy:
      await executeInRange(intRange, val => contractDeployLoop(mnemonic, val, Config.rpcUrl, gasPrice));
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

main()
  .then(() => console.log("Done"))
  .catch((err) => console.error(err));
