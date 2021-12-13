import { JsonRpcProvider } from "@ethersproject/providers";
import { Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import Greeter from "../Greeter.json";

export async function erc20TransferLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string,
  contractAddress: string
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  const contract = new Contract(contractAddress, Greeter.abi, wallet);
  let nonce = await wallet.getTransactionCount();
  while (true) {
    console.log(
      `Simulating transfer with account ${wallet.address}, nonce: ${nonce}`
    );
    await contract.simulateErc20Transfer({
      nonce,
      gasLimit: 500000,
      gasPrice: parseUnits("1", "gwei"),
    });
    nonce = nonce + 1;
  }
}
