import { Result } from "ftld";
import RpcClient, { Address } from "nimiq-rpc-client-ts";

const THRESHOLD = 0.25;
const STEPNESS = 4

export async function getSize(rpc: RpcClient, validator: Address): Promise<Result<string, number>> {
    const { data, error } = await rpc.validator.activeList()
    if (error) return Result.Err(error.message);

    const validatorBalance = data.find(({ address }) => address === validator)?.balance;
    if (!validatorBalance) return Result.Ok(0); // TODO: is this correct?

    const totalBalance = data.reduce((acc, { balance }) => acc + balance, 0);
    const size = validatorBalance / totalBalance;
    const s = Math.max(0, 1 - Math.pow(size / THRESHOLD, STEPNESS));
    return Result.Ok(s);
}
