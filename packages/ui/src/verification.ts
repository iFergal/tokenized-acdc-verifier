import {BACKEND_BASE_URL} from "./settings";

export class Credential {
    private sad: JsonValue
    unit: string
    txId: string
    amount: number
    dt?: string
    issuer?: string
    issuee?: string
    claim?: JsonValue
    checkpoints?: JsonValue
    contract?: JsonValue
    project?: JsonValue
    program?: JsonValue

    constructor(unit: string, sad: JsonValue, txId: string, amount: number) {
        this.unit = unit
        this.sad = sad
        this.txId = txId
        this.amount = amount

        // TODO - BK - Is there a better way to do this?
        this.dt = (sad as any)?.sad?.a?.dt
        this.issuee = (sad as any)?.sad?.a?.i
        this.issuer = (sad as any)?.sad?.i
        this.claim = (sad as any)?.sad?.a.claim
        this.checkpoints = (sad as any)?.sad?.a.checkpoints
        this.contract = (sad as any)?.sad?.a.contract
        this.project = (sad as any)?.sad?.a.project
        this.program = (sad as any)?.sad?.a.program
    }
}

export class VerificationError {
    message: string
    status: number
    statusText?: string

    constructor(message: string,
                status: number = 0,
                statusText?: string) {
        this.message = message
        this.status = status
        this.statusText = statusText
    }
}

export async function verifyACDC(vci: string, iss: string): Promise<JsonValue> {
    const credential: void | Response = await fetch(`${BACKEND_BASE_URL}/credentials/${vci}`)

    // @TODO - foconnor: If exists, re-query if not revoked. Revocation not in scope for PoC.
    if (credential && credential.ok) return await credential.json();

    const response: Response = await fetch(`${BACKEND_BASE_URL}/credentials/verify`, {
        method: "POST",
        body: JSON.stringify({ vci, iss }),
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) throw new VerificationError("Verification Failed", response.status, response.statusText)
    return await response.json();
}