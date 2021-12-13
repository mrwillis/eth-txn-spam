import { JsonRpcProvider } from "@ethersproject/providers";
import { Contract, ContractFactory, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import Greeter from "../Greeter.json";

export async function contractDeployLoop(
  mnemonic: string,
  index: number,
  rpcUrl: string
) {
  const wallet = Wallet.fromMnemonic(
    mnemonic,
    `m/44'/60'/0'/0/${index}`
  ).connect(new JsonRpcProvider(rpcUrl));
  const factory = new ContractFactory(Greeter.abi, Greeter.bytecode, wallet);
  let nonce = await wallet.getTransactionCount();
  while (true) {
    console.log(
      `Deploying Greeter contract with account ${wallet.address}, nonce: ${nonce}`
    );
    await factory.deploy({
      nonce,
      gasLimit: 500000,
      gasPrice: parseUnits("1", "gwei"),
    });
    nonce = nonce + 1;
  }
}
