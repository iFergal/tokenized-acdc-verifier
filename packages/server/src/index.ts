import express, { Request, Response, NextFunction } from "express";
import { SignifyClient, Tier, randomPasscode, ready } from "signify-ts";
import { join } from "path";
import { waitAndGetDoneOp } from "./utils";
import { getCredential, verifyCredential } from "./controllers/credentials";
import { query } from "./controllers/queries";

// @TODO - foconnor: Get from env
const oobi = "http://127.0.0.1:3902/oobi/EKorlZQDNi2Irgr5oI4E_aN3xj6cW_pdE-Sg3Cy1Pz7O/agent/EBZVkHEYxD-HcUu1Ff1o5C7m70YWPKWt8_MHYybfvXHz";
const schemaSaid = "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao";
export const issr = "EKorlZQDNi2Irgr5oI4E_aN3xj6cW_pdE-Sg3Cy1Pz7O";
export const ri = "EILOwPzcTrVJfKMxMLSDVmCc8Y9-zDv9mby-5C-hoaZX";

async function getClient(): Promise<SignifyClient> {
  await ready();
  const client = new SignifyClient("http://127.0.0.1:3901", randomPasscode(), Tier.low, "http://127.0.0.1:3903");  // @TODO - foconnor: Persist passcode
  await client.boot();
  await client.connect();
  
  // If already resolved, this is very fast
  await waitAndGetDoneOp(client, await client.oobis().resolve(oobi));
  await waitAndGetDoneOp(client, await client.oobis().resolve(`http://localhost:3000/oobi/${schemaSaid}`));

  try {
    await client.registries().get(ri);
  } catch (error: any) {
    const status = error?.message.split(" - ")[1];
    if (/404/gi.test(status)) {
      console.info(`Initial startup, resolving and querying registry (${ri}) for pre ${issr}`);
      await waitAndGetDoneOp(client, await client.keyStates().telquery(issr, ri));
    }
  }
  
  return client;
}

async function startServer(): Promise<void> {
  const app = express();
  const router = express.Router();
  
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
