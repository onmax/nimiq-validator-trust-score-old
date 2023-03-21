import { Client, Entity, Repository, Schema } from 'redis-om';
import { RedisClient } from './client';

class TimelineEntity extends Entity { }

export class Timeline extends RedisClient {
  private static repository: Repository<TimelineEntity>;

  constructor(url: URL) {
    super(url);
  }

  async init() {
    super.open();
    if(!Timeline.repository) Timeline.repository = await Timeline.createRepository()
    return this
  }

  private static async createRepository() {
    const schema = new Schema(TimelineEntity, {
      address: { type: 'string' },
      active: { type: "boolean" },
      epoch: { type: "number" },
    })

    const repository = super.getClient().fetchRepository(schema)

    try {
      // TODO: Check if index exists and avoid trycatch
      await repository.createIndex()
    } catch (error) {}

    return repository
  }

  async get(address: string, epoch: number) {
    if(!Timeline.repository) return null
    const maybeAddress = await Timeline.repository.search()
      .where('address').equals(address)
      .where('epoch').equals(epoch)
      .first()
    return maybeAddress
  } 

  async add(address: string, epoch: number, active: boolean) {
    const recordExists = !!(await this.get(address, epoch))
    if(recordExists) {
      console.debug(`Record ${address} already exists`)
      return
    }
    console.debug(`Adding record ${address}, ${epoch}, ${active}`)
    await Timeline.repository.createAndSave({ address, epoch, active })
  }
}