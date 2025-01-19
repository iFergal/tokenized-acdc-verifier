import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { SignifyClient, Tier, randomPasscode, ready } from "signify-ts";
import { join, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { waitAndGetDoneOp } from "./utils";
import { getCredential, verifyCredential } from "./controllers/credentials";
import { query } from "./controllers/queries";
import { config } from "./config";

async function getBran(path: string): Promise<string> {
  const dirPath = dirname(path);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
  if (!existsSync(path)) {
    await writeFile(path, "");
  }

  const contents = await readFile(path, "utf8");
  if (!contents) {
    const bran = randomPasscode();
    await writeFile(path, bran);
    return bran;
  }
  return contents;
}

async function getClient(): Promise<SignifyClient> {
  await ready();
  const client = new SignifyClient(config.keriaEndpoint, await getBran("./data/secret"), Tier.low, config.keriaBootEndpoint);
  await client.boot();
  await client.connect();
  
  // If already resolved, this is very fast
  await waitAndGetDoneOp(client, await client.oobis().resolve(config.issuerOobi));
  // await waitAndGetDoneOp(client, await client.oobis().resolve(`http://server:3000/oobi/${config.schemaSaid}`));
  await waitAndGetDoneOp(client, await client.oobis().resolve(`http://t10n.guild1.com:3000/oobi/EA3NRCtGF0czMPeiG5-CWbgCnmcpBDpPo2mYlxoGkk0j`));

  try {
    await client.registries().get(config.registryId);
  } catch (error: any) {
    const status = error?.message.split(" - ")[1];
    if (/404/gi.test(status)) {
      console.info(`Initial startup, resolving and querying registry (${config.registryId}) for pre ${config.issuerPre}`);
      await waitAndGetDoneOp(client, await client.keyStates().telquery(config.issuerPre, config.registryId));
    }
  }
  
  return client;
}

async function startServer(): Promise<void> {
  const app = express();
  const router = express.Router();
  
  app.use(cors());
  app.use(bodyParser.json());
  app.use(router);
  app.use("/oobi", express.static(join(__dirname, "schemas"), { setHeaders: (res, path) => {
    res.setHeader("Content-Type", "application/schema+json");
  }}));
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  });

  app.listen(3000, async () => {
    console.info(`Web server started on port 3000, static content (OOBIs) ready... launching Signify client`);
    const client = await getClient();
    app.set("client", client);

    router.get("/credentials/:said", getCredential);
    router.post("/credentials/verify", verifyCredential);
    router.post("/query", query);

    console.info(`Server ready`);
  });
}

void startServer();
