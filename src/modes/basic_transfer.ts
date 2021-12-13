import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

const sendAmount = parseUnits("0.001", 18);

export async function basicTransferLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string,
  range: number
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  let nonce = await wallet.getTransactionCount();
  while (true) {
    const recipient = Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${index + 1 > range ? 0 : index + 1}`
    ).connect(new JsonRpcProvider(rpcUrl));
    console.log(
      `Sending ${formatEther(sendAmount)} to ${recipient.address} from ${index}`
    );
    const txn = await wallet.sendTransaction({
      value: sendAmount,
      to: recipient.address,
      gasLimit: 100000,
      gasPrice: parseUnits("1", "gwei"),
      nonce,
    });
    console.log(
      `Done sending ${formatEther(sendAmount)} to ${
        recipient.address
      } from ${index}. Hash: ${txn.hash}`
    );
    nonce = nonce + 1;
  }
}
