import { Result } from "ftld";
import { Event } from "../types";

const H = 21;

export async function getAge(events: Event[]): Promise<Result<string, number>> {
    const creationEvent = events.find(({ event }) => event === "create-validator");
    if (!creationEvent) return Result.Err("Could not find creation event");

    const creationDate = new Date(creationEvent.timestamp);
    const now = new Date();
    const days = Math.floor((now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
    const a = 1 - Math.pow(2, -days / H);

    return Result.Ok(a);
}
