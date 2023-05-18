import express from "express";
import { getClients } from "./clients";
import { EventsFetcher } from "./fetcher";
import { Clients } from "./types";
import { Address } from "nimiq-rpc-client-ts";

const app = express();

let clients: Clients | undefined = undefined;
async function getClientsAsync(): Promise<Clients> {
  if (clients) return clients;
  clients = await getClients();
  return clients;
}

app.get("/validators", async (req, res) => {
  const { postgres } = await getClientsAsync()
  const validatorsResult = await postgres.getValidators()
  if (validatorsResult.isErr()) {
    res.status(500).json({ error: validatorsResult.unwrapErr() })
  } else {
    res.json(validatorsResult.unwrap().map(v => {
      const info = new URL(`${req.protocol}://${req.get("host")}/validators/${v.address}`).toString()
      return { ...v, info }
    }))
  }
});

app.get("/validators/:address", async (req, res) => {
  const { postgres } = await getClientsAsync()
  const score = await postgres.getValidatorScore(req.params.address as Address)
  if (score.isErr()) {
    res.status(500).json({ error: score.unwrapErr() })
  }

  const events = await postgres.getEventsByValidator(req.params.address as Address)
  if (events.isErr()) {
    res.status(500).json({ error: events.unwrapErr() })
  }

  res.json({
    ...score.unwrap(),
    events: events.unwrap()
  })
});

async function init() {
  const { rpc, postgres } = await getClientsAsync()
  await postgres.flush()

  const fetcher = new EventsFetcher(rpc, postgres)
  await fetcher.streamEvents()
  console.log("🥳🥳  Subscribed to events")

  console.log("🥳🥳  Fetching old events")
  console.time("Fetching old events")
  await fetcher.insertOldEvents()
  console.timeEnd("Fetching old events")
}

init()
app.listen(8080, () => { console.log("Listening on port 8080") });
