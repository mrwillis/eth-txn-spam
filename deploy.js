const { ethers } = require("ethers");
const Greeter = require("./src/Greeter.json");

require("dotenv").config();

const JSON_RPC_URL = process.env.PSDK_JSONRPC_URL || "http://localhost:10002";
const PRIVATE_KEY = process.env.PSDK_PRIVATE_KEY;

const main = async () => {
  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const balance = await provider.getBalance(signer.address);
  console.log("Balance", balance.toString());

  // deploy contract
  const factory = new ethers.ContractFactory(
    Greeter.abi,
    Greeter.bytecode,
    signer
  );
  const contract = await factory.deploy("Hello", {});
  await contract.deployed();

  console.log("deployed", contract.address);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
