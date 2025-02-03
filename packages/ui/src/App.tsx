/// <reference types="vite/types/importMeta.d.ts" />

import {useEffect, useState} from "react";
import {ConnectWalletButton, useCardano} from "@cardano-foundation/cardano-connect-with-wallet";
import {NetworkType} from "@cardano-foundation/cardano-connect-with-wallet-core";
import "./App.css";
import CircularProgress from "@mui/material/CircularProgress";
import {Asset, History, fetchAssetsFromAddr, fetchHistory, fetchMetaData, BlockFrostError} from "./BFUtils";
import {BACKEND_BASE_URL, POLICY_ID} from "./Settings";
import {verifyACDC} from "./Verification";

export function App() {
  const { isConnected, stakeAddress } = useCardano({ limitNetwork: NetworkType.TESTNET });
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadInfo, setLoadInfo] = useState<string|null>()
  const [errorMessage, setErrorMessage] = useState<string|null>()

  interface Credential {
    unit: string
    sad: any
    txId: string
    amount: number
  }

  useEffect(() => {
    async function fetchACDCs() {
      try {
        setLoadInfo("Initializing, Querying asset information from wallet")
        const assets: Asset[] = await fetchAssetsFromAddr(stakeAddress)

        for (const asset of assets) {
          // @ts-ignore
          if (asset.unit.startsWith(POLICY_ID)) {
            setLoadInfo("Fetching the transaction history for the asset")
            const history: History[] = await fetchHistory(asset.unit)

            for (const historyItem of history) {
              if (historyItem.action === "minted") {
                setLoadInfo("Querying the meta data for the minting tx")

                const metadatum: Map<string,any> = await fetchMetaData(historyItem.tx_hash)
                const acdcMetadata: any = Object.values(metadatum[POLICY_ID])[0];

                if (acdcMetadata.claimACDCSaid && acdcMetadata.claimIssSaid) {
                  setLoadInfo("Verifying the ACDC with KERI")

                  const result: any = await verifyACDC(acdcMetadata.claimACDCSaid, acdcMetadata.claimIssSaid);

                  if (result) {
                    setCredentials([...credentials, {
                      unit: asset.unit,
                      sad: result.sad,
                      txId: historyItem.tx_hash,
                      amount: asset.quantity
                    }])
                  }
                }
              }
            }
          }
        }

        setLoadInfo(null)
        setErrorMessage(null)
      } catch (error: any) {
        if (error instanceof BlockFrostError) {
          setErrorMessage(`BlockFrost Error: ${error.message},${error.status},${error.statusText}`)
          console.error('An error occured: ', error)
        }
      }
    }

    if (isConnected) {fetchACDCs().then()} else {setCredentials([])}
  }, [isConnected]);

  // @ts-ignore
  return (
    <>
      <ConnectWalletButton
          label="Connect a Cardano Wallet"
          dAppName="Validation App"
          limitNetwork={NetworkType.TESTNET}
      />

      {errorMessage ? <h2>{errorMessage}</h2> : <></>}

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
          isConnected ? <></> : <>
          <div className="info-section">
            <h2>Token Asset Verification POC</h2>
            <div className="help-section">
              This <b>POC</b> is a validation <b>DAPP</b> enabling holders of the Corda <b>V10N</b> Tokens to Cardano bridged
              tokens to verify associated <b>V10N</b> export data that is stored as issued statements in <b>KERI</b>.<br/><br/>
              Native Assets in your wallet are scanned to match up on the Policy ID and then the associated MetaData from the minting transaction is
              retrieved to get the <b>KERI</b> <b>SAID</b> Identifier.<br/>
            </div>
            <ul>
              <li><strong>Policy Id: </strong><a
                  href={`https://preprod.cardanoscan.io/tokenPolicy/${POLICY_ID}`}>{POLICY_ID}</a></li>
              <li><strong>Cardano Network: </strong>{NetworkType.TESTNET}</li>
              <li><strong>Backend Server: </strong>{BACKEND_BASE_URL}</li>
            </ul>
          </div>
        </>
      }
    </>
  )
}
