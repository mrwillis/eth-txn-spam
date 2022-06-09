import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, Wallet } from "ethers";
import { formatEther, parseUnits } from "ethers/lib/utils";

const sendAmount = parseUnits("0.001", 18);
const gasLimit = BigNumber.from(100_000);

export async function basicTransferLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string,
  range: number,
  gasPrice: BigNumber,
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  let nonce = await wallet.getTransactionCount();
  while (true) {
    const receiverIndex = (index + 1) % range;
    const recipient = Wallet.fromMnemonic(
      mnemonic,
      `m/44'/60'/0'/0/${receiverIndex}`
    ).connect(new JsonRpcProvider(rpcUrl));
    console.log(
      `Sending ${formatEther(sendAmount)} to ${recipient.address} from ${index}`
    );
    const txn = await wallet.sendTransaction({
      value: sendAmount,
      to: recipient.address,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
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
