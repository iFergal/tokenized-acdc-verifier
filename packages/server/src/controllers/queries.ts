import { Request, Response } from "express";
import { SignifyClient } from "signify-ts";
import { waitAndGetDoneOp } from "../utils";
import { config } from "../config";

export async function query(req: Request, res: Response) {
  const { vci } = req.body;
  if (!vci || typeof vci !== "string") {
    res.status(400).send();
    return;
  }

  const client: SignifyClient = req.app.get("client");
  await waitAndGetDoneOp(client, await client.keyStates().query(config.issuerPre));
  const completedOp = await waitAndGetDoneOp(client, await client.keyStates().telquery(config.issuerPre, config.registryId, vci));
  res.status(200).send(completedOp?.response);
}
