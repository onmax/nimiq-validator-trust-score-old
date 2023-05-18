import * as dotenv from 'dotenv';
import RpcClient from 'nimiq-rpc-client-ts';
import PostgresClient from './database/client';
import { Clients } from './types';

function envs() {
  dotenv.config()

  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is not set");
  const rpcUsername = process.env.RPC_USERNAME || '';
  const rpcPassword = process.env.RPC_PASSWORD || '';
  if (!rpcUsername || !rpcPassword) {
    console.warn("RPC_USERNAME and RPC_PASSWORD are not set. No authentication will be used.");
  }

  const postgresUrl = process.env.POSTGRES_URL || '';
  if (!postgresUrl) throw new Error("POSTGRES_URL is not set");
  const postgresSecret = process.env.POSTGRES_SECRET || '';
  if (!postgresSecret) throw new Error("POSTGRES_SECRET is not set");

  return {
    rpc: {
      url: new URL(rpcUrl),
      auth: {
        username: rpcUsername,
        password: rpcPassword
      }
    },
    postgres: {
      url: new URL(postgresUrl),
      secret: postgresSecret
    }
  }
}

export async function getClients(): Promise<Clients> {
  const { postgres: postgresInfo, rpc: rpcInfo } = envs()
  const rpc = new RpcClient(rpcInfo.url, rpcInfo.auth)
  await rpc.init()
  const postgres = new PostgresClient(postgresInfo.url, postgresInfo.secret)
  return { rpc, postgres }
}
