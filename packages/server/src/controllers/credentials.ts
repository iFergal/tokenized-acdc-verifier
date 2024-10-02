import { Request, Response } from "express";
import { Saider, Serder, SignifyClient } from "signify-ts";
import { waitAndGetDoneOp } from "../utils";
import { config } from "../config";

export async function getCredential(req: Request, res: Response) {
  const said = req.params.said;
  const client: SignifyClient = req.app.get("client");
  console.log(`client is ${client}`);
  try {
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

  // @TODO - foconnor: For future reference - on Corda side, the d field should be converted like this before storing.
  // const acdcBytes = Buffer.from(new Serder({...acdcSad, d: '############################################'}).raw);

  // @TODO - foconnor: Get from API using hex IDs and parse as JSON objects
  const vciHex = Buffer.from(new Saider({ qb64: vci }).raw).toString("hex");
  const issHex = Buffer.from(new Saider({ qb64: iss }).raw).toString("hex");

  const acdcked = {
    "v": "ACDC10JSON000197_",
    "d": "EG9StkqLEuzb9uxaBtUc-b0rFn_Kdu827SG6BlCX0WbX",
    "i": "EKorlZQDNi2Irgr5oI4E_aN3xj6cW_pdE-Sg3Cy1Pz7O",
    "ri": "EILOwPzcTrVJfKMxMLSDVmCc8Y9-zDv9mby-5C-hoaZX",
    "s": "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao",
    "a": {
      "d": "EFowivdaUg2jOzIlkS1ObjUMtIrDQ_ifC2YuRYGtEQKq",
      "i": "ELkGbbRkgs36I3w4KUWQTNgcm6G-pJlztn1vNtRFuhNY",
      "LEI": "5493001KJTIIGC8Y1R17",
      "dt": "2024-10-01T16:30:55.725000+00:00"
    }
  };
  const issked = {
    "v": "KERI10JSON0000ed_",
    "t": "iss",
    "d": "EII2xiOaEvx9jutCxmygUnII9larRge0C8L01L0O-7Km",
    "i": "EG9StkqLEuzb9uxaBtUc-b0rFn_Kdu827SG6BlCX0WbX",
    "s": "0",
    "ri": "EILOwPzcTrVJfKMxMLSDVmCc8Y9-zDv9mby-5C-hoaZX",
    "dt": "2024-10-01T16:30:55.725000+00:00"
  };
  
  // This could be better done in the background with watchers
  await waitAndGetDoneOp(client, await client.keyStates().query(config.issuerPre));
  await waitAndGetDoneOp(client, await client.keyStates().telquery(config.issuerPre, config.registryId, acdcked.d));

  const completedOp = await waitAndGetDoneOp(client, await client.credentials().verify(new Serder(acdcked), new Serder(issked)));
  res.status(200).send(completedOp?.metadata?.ced);
}
