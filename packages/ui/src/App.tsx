/// <reference types="vite/types/importMeta.d.ts" />

import { useEffect } from "react";
import { ConnectWalletButton, useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import "./App.css";

enum BLOCKFROST_ASSETS_URL {
  MAINNET = "https://mainnet.blockfrost.cf-systems.org/assets",
  PREPROD = "https://preprod.blockfrost.cf-systems.org/assets",
  PREVIEW = "https://preview.blockfrost.cf-systems.org/assets"
}

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? "http://localhost:3000";
const POLICY_ID = import.meta.env.VITE_POLICY_ID ?? "425249434b53";

export function App() {
  const { accountBalance, isConnected } = useCardano();

  useEffect(() => {
    async function fetchACDC() {
      // If accountBalance contains relevant policy_id, check on backend if credential exists by asset_name
      // If exists, show and do a TEL query to async check if revoked since last check

      // If not exists, get iss SAID from token via Blockfrost, and verify using asset_name and iss SAID
      // Select Blockfrost URL based on wallet network
    }

    if (isConnected) {
      fetchACDC();
    }
  }, [isConnected]);

  return (
    <>
      <ConnectWalletButton
        // limitNetwork={undefined} - not working
      />
    </>
  )
}
