import { JsonRpcProvider } from "@ethersproject/providers";
import { formatEther, parseEther, parseUnits } from "@ethersproject/units";
import { Wallet } from "@ethersproject/wallet";
import { basicTransferLoop } from "./modes/basic_transfer";
import { complexTransactionLoop } from "./modes/complex_transaction";
import { contractDeployLoop } from "./modes/contract_deploy";
import { erc20TransferLoop } from "./modes/erc20_transfer";
import { Mode } from "./types";

const minimumBalance = parseEther("10");
const spamContractAddress = "0xc33875F3d4bb688185316f7335daa90849F795A4";

async function main() {
  let mode = Mode.Transfer;
  if (process.env.MODE) {
    mode = parseMode(process.env.MODE);
  }
  if (!process.env.RANGE) {
    throw new Error(`RANGE not defined.`);
  }
  if (!process.env.RPC_URL) {
    throw new Error(`RPC_URL not defined`);
  }
  if (!process.env.MNEMONIC) {
    throw new Error(`MNEMONIC not defined`);
  }
  const mnemonic = process.env.MNEMONIC;
  const intRange = parseInt(process.env.RANGE, 10);
  await distributeNativeCurrencyIfNecessary(
    mnemonic,
    process.env.RPC_URL!,
    intRange
  );
  switch (mode) {
    case Mode.Transfer:
      await Promise.all(
        Array.from(Array(intRange).keys()).map((val) =>
          basicTransferLoop(mnemonic, val, process.env.RPC_URL!, intRange)
        )
      );
    case Mode.ERC20:
      await Promise.all(
        Array.from(Array(intRange).keys()).map((val) =>
          erc20TransferLoop(
            mnemonic,
            val,
            process.env.RPC_URL!,
            spamContractAddress
          )
        )
      );
    case Mode.Complex:
      await Promise.all(
        Array.from(Array(intRange).keys()).map((val) =>
          complexTransactionLoop(
            mnemonic,
            val,
            process.env.RPC_URL!,
            spamContractAddress
          )
        )
      );
    case Mode.Deploy:
      await Promise.all(
        Array.from(Array(intRange).keys()).map((val) =>
          contractDeployLoop(mnemonic, val, process.env.RPC_URL!)
        )
      );
    default:
      throw new Error(`Unknown mode ${mode!}`);
  }
}

function parseMode(mode: string) {
  const parsedMode = parseInt(mode, 10);
  switch (parsedMode) {
    case Mode.Transfer:
      return Mode.Transfer;
    case Mode.ERC20:
      return Mode.ERC20;
    case Mode.Deploy:
      return Mode.Deploy;
    case Mode.Complex:
      return Mode.Complex;
    default:
      throw new Error(`Unknown mode! Raw: ${mode}. Parsed: ${parsedMode}`);
  }
}

async function distributeNativeCurrencyIfNecessary(
  mnemonic: string,
  rpcUrl: string,
  range: number
) {
  console.log(
    `Distributing account balance evenly to sub accounts if necessary`
  );
  const sendingWallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/0`
  ).connect(new JsonRpcProvider(rpcUrl));
  const currentBalance = await sendingWallet.provider.getBalance(
    sendingWallet.address
  );
  console.log(`Parent address: ${sendingWallet.address}`);
  console.log(`Parent balance: ${formatEther(currentBalance)}`);
  let nonce = await sendingWallet.getTransactionCount();
  const distributionAmount = currentBalance.div(range);
  for (const index of Array.from(Array(range).keys())) {
    console.log(`Processing account index ${index}`);
    if (index === 0) {
      continue;
    }
    const recipient = Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${index}`
    ).connect(new JsonRpcProvider(rpcUrl));
    const recipientBalance = await sendingWallet.provider.getBalance(
      recipient.address
    );
    if (recipientBalance.gt(minimumBalance)) {
      console.log(
        `Recipient ${recipient.address} is above the minimum. Skipping.`
      );
      continue;
    }
    await sendingWallet.sendTransaction({
      value: distributionAmount,
      to: recipient.address,
      gasLimit: 100000,
      gasPrice: parseUnits("10", "gwei"),
      nonce,
    });
    nonce = nonce + 1;
    console.log(
      `Sending ${formatEther(distributionAmount)} to ${recipient.address}`
    );
  }
}

main()
  .then(() => console.log("Done"))
  .catch((err) => console.error(err));
