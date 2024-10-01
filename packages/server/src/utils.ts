import { Operation, SignifyClient } from "signify-ts";

export async function waitAndGetDoneOp(
  client: SignifyClient,
  op: Operation,
  timeout = 10000,
  interval = 50
): Promise<Operation> {
  const startTime = new Date().getTime();
  while (!op.done && new Date().getTime() < startTime + timeout) {
    op = await client.operations().get(op.name);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  if (!op.done) {
    throw new Error(`Operation not completing: ${JSON.stringify(op, null, 2)}`);
  }
  return op;
}
