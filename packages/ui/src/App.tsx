/// <reference types="vite/types/importMeta.d.ts" />

import { useEffect, useState } from "react";
import { ConnectWalletButton, useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import "./App.css";
import CircularProgress from "@mui/material/CircularProgress";

enum BLOCKFROST_ASSETS_URL {
  MAINNET = "https://mainnet.blockfrost.cf-systems.org",
  PREPROD = "https://preprod.blockfrost.cf-systems.org",
  PREVIEW = "https://preview.blockfrost.cf-systems.org"
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:3000";
const POLICY_ID = import.meta.env.VITE_POLICY_ID ?? "0a67b67f0157370f7c32d3fbbbe9e3062cb3bba200ba1eb39e0d09a1";

async function fetchBlockfrost(path: string) {
  // @TODO - foconnor: Detect from wallet
  const response = await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/${path}`);
  return await response.json();
}

async function verifyACDC(vci: string, iss: string) {
  const credential = await fetch(`${BACKEND_BASE_URL}/credentials/${vci}`).catch(error => {
    console.error(error);  // @TODO - check for actual 404 or re-throw
  });

  if (!credential) return;

  // @TODO - foconnor: If exists, re-query if not revoked. Revocation not in scope for PoC.
  if (credential.ok) {
    return await credential.json();
  }

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

interface Credential {
  unit: string
  sad: any
  txId: string
  amount: number
}

interface Asset {unit: string, quantity: number}

export function App() {
  const { isConnected, stakeAddress } = useCardano({ limitNetwork: NetworkType.TESTNET });
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadInfo, setLoadInfo] = useState<string>()

  useEffect(() => {
    async function fetchACDCs() {
      setLoadInfo("Initializing, Querying asset information from wallet")
      const assets: Asset[] = await fetchBlockfrost(`accounts/${stakeAddress}/addresses/assets`);

      for (const asset of assets) {
        // @ts-ignore
        if (asset.unit.startsWith(POLICY_ID)) {
          setLoadInfo("Fetching the transaction history for the asset")
          const history = await fetchBlockfrost(`assets/${asset.unit}/history`);

          for (const historyItem of history) {
            if (historyItem.action === "minted") {
              setLoadInfo("Querying the meta data for the minting tx")
              const metadatum = (await fetchBlockfrost(`txs/${historyItem.tx_hash}/metadata`)).find(metadatum => metadatum.label === "721").json_metadata;
              const acdcMetadata: any = Object.values(metadatum[POLICY_ID])[0];
              if (acdcMetadata.claimACDCSaid && acdcMetadata.claimIssSaid) {
                setLoadInfo("Verifying the ACDC with KERI")
                const result = await verifyACDC(acdcMetadata.claimACDCSaid, acdcMetadata.claimIssSaid);
                if (result) {
                  console.log(result)
                  setCredentials([...credentials, {unit: asset.unit,
                    sad: result.sad,
                    txId: historyItem.tx_hash,
                    amount: asset.quantity}])
                }
              }
            }
          } 
        }
      }

      setLoadInfo("")
    }

    if (isConnected) {fetchACDCs();
    } else {setCredentials([])
    }
  }, [isConnected]);

  // @ts-ignore
  return (
    <>
      <ConnectWalletButton
          label="Connect a Cardano Wallet"
          dAppName="Validation App"
          limitNetwork={NetworkType.TESTNET}
      />

      {credentials.map(credential => (
        <>

          <div className="info-section">
            <h2>Asset Information</h2>
            <ul>
              <li><strong>Asset:</strong> {credential.unit}</li>
              <li><strong>Quantity:</strong> {credential.amount}</li>
              <li><strong>TxID:</strong> <a href={`https://preprod.cardanoscan.io/transaction/${credential.txId}`} target="_blank">{credential.txId}</a></li>
            </ul>
          </div>

          <div className="info-section">
            <h2>ACDC Information</h2>
            <ul>
              <li><strong>Issuer:</strong> {credential.sad.i}</li>
              <li><strong>Issuee:</strong> {credential.sad.a.i}</li>
              <li><strong>Date of issuance:</strong> {credential.sad.a.dt}</li>
            </ul>
          </div>

          <div className="info-section">
            <h2>Claim</h2>
            <pre>{JSON.stringify(credential.sad.a.claim, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Checkpoints</h2>
            <pre>{JSON.stringify(credential.sad.a.checkpoints, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Contract</h2>
            <pre>{JSON.stringify(credential.sad.a.contract, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Project</h2>
            <pre>{JSON.stringify(credential.sad.a.project, null, 2)}</pre>
          </div>
          
          <div className="info-section">
            <h2>Program</h2>
            <pre>{JSON.stringify(credential.sad.a.program, null, 2)}</pre>
          </div>
        </>
      ))}

      {isConnected && credentials.length === 0 ?
          <div className="center"><CircularProgress/><h2 className="loading-title">{loadInfo}</h2></div>:
          <>
            <div className="info-section">
              <h2>Token Asset Verification POC</h2>
              <pre>Put some information here regarding the verification process</pre>
            </div>
          </>
      }
    </>
  )
}
