import {BACKEND_BASE_URL} from "./Settings";

export class VerificationError {
    message: string
    status: number
    statusText: string | null

    constructor(message: string,
                status: number = 0,
                statusText: string | null = null) {
        this.message = message
        this.status = status
        this.statusText = statusText
    }
}

export async function verifyACDC(vci: string, iss: string): Promise<any> {
    const credential: void | Response = await fetch(`${BACKEND_BASE_URL}/credentials/${vci}`)
    if (!credential) throw new VerificationError("No credential");

    // @TODO - foconnor: If exists, re-query if not revoked. Revocation not in scope for PoC.
    if (credential.ok) return await credential.json();

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