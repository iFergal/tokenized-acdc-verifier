/// <reference types="vite/types/importMeta.d.ts" />

import { useEffect, useState } from "react";
import { ConnectWalletButton, useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import "./App.css";

enum BLOCKFROST_ASSETS_URL {
  MAINNET = "https://mainnet.blockfrost.cf-systems.org",
  PREPROD = "https://preprod.blockfrost.cf-systems.org",
  PREVIEW = "https://preview.blockfrost.cf-systems.org"
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://dev.keria.cf-keripy.metadata.dev.cf-deployments.org:5632";
const POLICY_ID = import.meta.env.VITE_POLICY_ID ?? "d441227553a0f1a965fee7d60a0f724b368dd1bddbc208730fccebcf";

async function fetchBlockfrost(path: string) {
  // @TODO - foconnor: Detect from wallet
  const response = await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/${path}`);
  return await response.json();
}

async function verifyACDC(vci: string, iss: string) {
  // const credential = await fetch(`${BACKEND_BASE_URL}/credentials/${vci}`).catch(error => {
  //   console.error(error);  // @TODO - check for actual 404 or re-throw
  // });

  // if (!credential) return;

  // @TODO - foconnor: If exists, re-query if not revoked. Revocation not in scope for PoC.
  //if (credential.ok) {
  //  return await credential.json();
  //}
  if (vci !== "EDlZ9u5_yGUiXWyNx2Tp-N4SXj5oRxF6KL8c3gMP7XbR") return;

  const response = await fetch(`${BACKEND_BASE_URL}/credentials/verify`, {
    method: "POST",
    body: JSON.stringify({ vci, iss }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) return;

  return await response.json();
}

export function App() {
  const { isConnected, stakeAddress } = useCardano({ limitNetwork: NetworkType.TESTNET });
  const [credentials, setCredentials] = useState<any[]>([]);  // @TODO - foconnor: type by schema

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
                const result = await verifyACDC(acdcMetadata.claimACDCSaid, acdcMetadata.claimIssSaid);
                if (result) {
                  setCredentials([...credentials, { data: result, txid: historyItem.tx_hash }]);
                }
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
      {credentials.map(credential => (
        <>
          <h2>Token linked to verified ACDC / txid: {credential.txid}</h2>
          <div className="info-section">
            <ul>
              <li><strong>Issuer:</strong> {credential.data.i}</li>
              <li><strong>Issuee:</strong> {credential.data.a.i}</li>
              <li><strong>Date of issuance:</strong> {credential.data.a.dt}</li>
            </ul>
          </div>

          <div className="info-section">
            <h2>Claim</h2>
            <pre>{JSON.stringify(credential.data.a.claim, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Checkpoints</h2>
            <pre>{JSON.stringify(credential.data.a.checkpoints, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Contract</h2>
            <pre>{JSON.stringify(credential.data.a.contract, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Project</h2>
            <pre>{JSON.stringify(credential.data.a.project, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Program</h2>
            <pre>{JSON.stringify(credential.data.a.program, null, 2)}</pre>
          </div>
      </>
      ))}
      
      {isConnected ? (credentials.length === 0 ? <p>No verified tokens found</p> : null) : <p>Connect your wallet!</p>}
    </>
  )
}
