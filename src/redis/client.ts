import { Client } from 'redis-om';

export class RedisClient {
  private static url: URL;
  private static client: Client;
  protected static isOpen: boolean = false;

  constructor(url: URL) {
    RedisClient.url = url;
    RedisClient.client = new Client();
  }

  protected async open() {
    if (RedisClient.isOpen) return this;
    await RedisClient.client.open(RedisClient.url.href);
    RedisClient.isOpen = true;
    return this;
  }

  public static getClient() {
    return RedisClient.client;
  }
}