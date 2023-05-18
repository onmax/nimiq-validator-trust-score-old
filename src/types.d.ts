import RpcClient from "nimiq-rpc-client-ts";
import PostgresClient from "./database/client";

export type EventName = "create-validator" | "deactivate-validator" | "reactivate-validator" | "retire-validator" | "delete-validator";
export type Event = {
    event: EventName,
    event_id: number,
    validator: string,
    validator_id: number,
    hash: string,
    timestamp: string,
    genesis?: boolean
}

export type Clients = {
    rpc: RpcClient;
    postgres: PostgresClient;
}

export type Score = {
    score: number
    score_size: number
    score_age: number
    score_uptime: number
}
