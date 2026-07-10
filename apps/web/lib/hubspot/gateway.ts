import type {
  HubSpotSnapshot,
  HubSpotSnapshotQuery,
  HubSpotWriteCommand,
  HubSpotWriteReceipt,
  JsonObject
} from "./contracts.js";

export interface HubSpotDataGateway {
  write<T extends JsonObject>(command: HubSpotWriteCommand<T>): Promise<HubSpotWriteReceipt>;
  readBack<T extends JsonObject>(receipt: HubSpotWriteReceipt): Promise<HubSpotSnapshot<T>>;
  read<T extends JsonObject>(query: HubSpotSnapshotQuery): Promise<HubSpotSnapshot<T>>;
}
