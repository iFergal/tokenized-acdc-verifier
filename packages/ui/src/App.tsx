/// <reference types="vite/types/importMeta.d.ts" />

import { useEffect } from "react";
import { ConnectWalletButton, useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import "./App.css";

enum BLOCKFROST_ASSETS_URL {
  MAINNET = "https://mainnet.blockfrost.cf-systems.org",
  PREPROD = "https://preprod.blockfrost.cf-systems.org",
  PREVIEW = "https://preview.blockfrost.cf-systems.org"
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:3000";
const POLICY_ID = import.meta.env.VITE_POLICY_ID ?? "d441227553a0f1a965fee7d60a0f724b368dd1bddbc208730fccebcf";

async function fetchBlockfrost(path: string) {
  // @TODO - foconnor: Detect from wallet
  const response = await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/${path}`);
  return await response.json();
}

async function verifyACDC(vci: string, iss: string) {
  const credential = await fetch(`${BACKEND_BASE_URL}/credentials/${vci}`);

  // @TODO - foconnor: If exists, re-query if not revoked. Revocation not in scope for PoC.
  if (credential.ok) {
    console.info(`Credential: ${JSON.stringify(credential, null, 2)}`);
    return;
  }

  const response = await fetch(`${BACKEND_BASE_URL}/credentials/verify`, {
    method: "POST",
    body: JSON.stringify({ vci, iss }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  console.info(`Credential: ${JSON.stringify(await response.json(), null, 2)}`);
}

export function App() {
  const { isConnected, stakeAddress } = useCardano({ limitNetwork: NetworkType.TESTNET });

  useEffect(() => {
    async function fetchACDCs() {
      // @TODO - foconnor: This entire block could do with some typing and less nesting. OK for now.
      const assets = await fetchBlockfrost(`accounts/${stakeAddress}/addresses/assets`);
      for (const asset of assets) {
        // @ts-ignore
        if (asset.unit.startsWith(POLICY_ID)) {
          const history = await fetchBlockfrost(`assets/${asset.unit}/history`);
          for (const historyItem of history) {
            if (historyItem.action === "minted") {
              const metadatum = (await fetchBlockfrost(`txs/${historyItem.tx_hash}/metadata`)).find(metadatum => metadatum.label === "721").json_metadata;
              const acdcMetadata: any = Object.values(metadatum[POLICY_ID])[0];
              if (acdcMetadata.claimACDCSaid && acdcMetadata.claimIssSaid) {
                await verifyACDC(acdcMetadata.claimACDCSaid, acdcMetadata.claimIssSaid);
              }
            }
          } 
        }
      }
    }

    if (isConnected) {
      fetchACDCs();
    }
  }, [isConnected]);

  return (
    <>
      <ConnectWalletButton
        limitNetwork={NetworkType.TESTNET}
      />
    </>
  )
}
