import {query} from "server/src/controllers/queries";

export enum BLOCKFROST_ASSETS_URL {
    MAINNET = "https://mainnet.blockfrost.cf-systems.org",
    PREPROD = "https://preprod.blockfrost.cf-systems.org",
    PREVIEW = "https://preview.blockfrost.cf-systems.org"
}

export class BlockFrostError {
    message: string
    status: number
    statusText: string

    constructor(message: string,
                status: number,
                statusText: string) {
        this.message = message
        this.status = status
        this.statusText = statusText
    }
}

export interface Asset {unit: string, quantity: number}
export interface History {action: string, tx_hash: string}

export async function fetchAssetsFromAddr(stakeAddress: string|null): Promise<Asset[]> {
    const response: Response = await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/accounts/${stakeAddress}/addresses/assets`);
    if (response.ok) return await response.json()
    else throw new BlockFrostError(`Issues fetching assets from address ${stakeAddress}`, response.status, response.statusText)
}

export async function fetchHistory(unit: string): Promise<History[]> {
    const response: Response = await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/assets/${unit}/history`);
    if (response.ok) return await response.json()
    else throw new BlockFrostError(`Issues fetching history from unit ${unit}`, response.status, response.statusText)
}

export async function fetchMetaData(txHash: string): Promise<Map<string,any>> {
    const response: Response = (await fetch(`${BLOCKFROST_ASSETS_URL.PREPROD}/txs/${txHash}/metadata`))
    console.log(response)
    if (response.ok) {
        const json = await response.json()
        const ret = json.find(metadatum => metadatum.label === "721").json_metadata;
        console.log(ret)
        return ret
    }
    else throw new BlockFrostError(`Issues fetching meta data from history item`, response.status, response.statusText)
}