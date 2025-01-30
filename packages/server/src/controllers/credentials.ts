import { Request, Response } from "express";
import { Saider, Serder, SignifyClient, Dict } from "signify-ts";
import { waitAndGetDoneOp } from "../utils";
import { config } from "../config";

export async function getCredential(req: Request, res: Response) {
  const said = req.params.said;
  const client: SignifyClient = req.app.get("client");
  try {
    console.log(`getting Credential for ${said}`)
    const data = await client.credentials().get(said);
    res.status(200).send(data);
  } catch (error: any) {
    const status = error?.message.split(" - ")[1];
    if (/404/gi.test(status)) {
      res.status(404).send();
    } else {
      throw error;
    }
  }
}

export async function verifyCredential(req: Request, res: Response) {
  const client: SignifyClient = req.app.get("client");
  const { vci, iss } = req.body;

  const vciHex = Buffer.from(new Saider({ qb64: vci }).raw).toString("hex");
  const issHex = Buffer.from(new Saider({ qb64: iss }).raw).toString("hex");

  console.log(`vciHex is ${vciHex}`)
  console.log(`issHex is ${issHex}`)
  console.log(`vci is ${vci}`)
  console.log(`iss is ${iss}`)

  console.log(`http://t10n.guild1.com:9090/api/public/attachment/${vciHex}`)
  console.log(`http://t10n.guild1.com:9090/api/public/attachment/${issHex}`)

  // @TODO - foconnor: Improve typing post PoC.
  const acdcked = await (await fetch(`http://t10n.guild1.com:9090/api/public/attachment/${vciHex}`)).json() as Dict<any>;
  const issked = await (await fetch(`http://t10n.guild1.com:9090/api/public/attachment/${issHex}`)).json() as Dict<any>;

  acdcked.d = vci;
  issked.d = iss;

  console.log(`acdcked.d ${acdcked.d}`)
  
  // This could be better done in the background with watchers
  await waitAndGetDoneOp(client, await client.keyStates().query(config.issuerPre));
  await waitAndGetDoneOp(client, await client.keyStates().telquery(config.issuerPre, config.registryId, acdcked.d));

  const completedOp = await waitAndGetDoneOp(client, await client.credentials().verify(new Serder(Saider.saidify(acdcked)[1]), new Serder(Saider.saidify(issked)[1])));
  res.status(200).send(completedOp?.metadata?.ced);
}
