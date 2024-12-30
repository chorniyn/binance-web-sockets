import {
  BatchWriteItemCommand,
  DynamoDBClient,
  WriteRequest,
  AttributeValue
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

function chunks<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const putRequestMapper = (item: any) => ({
  PutRequest: {
    Item: marshall(item, { removeUndefinedValues: true }),
  },
});
const putResponseReader = (response: WriteRequest) =>
  response.PutRequest!.Item!;
export const batchWrite = <T>({
  items,
  tableName,
  dynamoDbClient,
  parallelism = 5,
}: {
  items: Array<T>;
  tableName: string;
  dynamoDbClient: DynamoDBClient;
  parallelism?: number;
}): Promise<T[]> => {
  return batchWriteOperation({
    items,
    tableName,
    dynamoDbClient,
    parallelism,
    operationName: "store",
    writeRequestMapper: putRequestMapper,
    writeResponseReader: putResponseReader,
  });
};

type DynamoDbRecord = Record<string, AttributeValue>;
const putDynamoDbRecordRequestMapper = <T extends DynamoDbRecord>(item: T) => ({
  PutRequest: {
    Item: item,
  },
});

export const batchWriteDynamoDbItems = ({
  items,
  tableName,
  dynamoDbClient,
  parallelism = 5,
}: {
  items: Array<DynamoDbRecord>;
  tableName: string;
  dynamoDbClient: DynamoDBClient;
  parallelism?: number;
}): Promise<DynamoDbRecord[]> => {
  return batchWriteOperation({
    items,
    tableName,
    dynamoDbClient,
    parallelism,
    operationName: "store",
    writeRequestMapper: putDynamoDbRecordRequestMapper,
    writeResponseReader: putResponseReader,
    dynamoDbToItem: (r) => r,
  });
};

export const batchWriteOrFail = async <T>({
  items,
  tableName,
  dynamoDbClient,
  parallelism = 5,
  operation,
}: {
  items: Array<T>;
  tableName: string;
  dynamoDbClient: DynamoDBClient;
  parallelism?: number;
  operation: string;
}): Promise<void> => {
  const failures = await batchWriteOperation({
    items,
    tableName,
    dynamoDbClient,
    parallelism,
    operationName: "store",
    writeRequestMapper: putRequestMapper,
    writeResponseReader: putResponseReader,
  });
  if (failures.length !== 0) {
    throw Error("Failed to store records: " + operation);
  }
};
const deleteRequestMapper = (item: any) => ({
  DeleteRequest: {
    Key: marshall(item),
  },
});
const deleteResponseReader = (response: WriteRequest) =>
  response.DeleteRequest!.Key!;

const batchWriteOperation = async <T>({
  items,
  tableName,
  dynamoDbClient,
  parallelism = 5,
  writeRequestMapper,
  writeResponseReader,
  operationName,
  dynamoDbToItem = (record) => unmarshall(record) as T,
}: {
  items: Array<T>;
  tableName: string;
  dynamoDbClient: DynamoDBClient;
  parallelism?: number;
  writeRequestMapper: (item: T, index: number) => WriteRequest;
  writeResponseReader: (
    request: WriteRequest,
  ) => Record<string, AttributeValue>;
  dynamoDbToItem?: (dynamoDbRecord: Record<string, AttributeValue>) => T;
  operationName: string;
}): Promise<T[]> => {
  if (!items.length) {
    return [];
  }
  /**
   * @param items
   * @return array of failed items
   */
  const chunkSize = 25;
  const writeChunk = async (
    items: T[],
    chunkIndex: number,
  ): Promise<Array<T>> => {
    const shift = chunkIndex * chunkSize;
    const command = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: items.map((item, index) =>
          writeRequestMapper(item, index + shift),
        ),
      },
    });
    const result = await dynamoDbClient.send(command);
    const unprocessedItems: Record<string, WriteRequest[]> | undefined =
      result.UnprocessedItems;
    if (unprocessedItems) {
      const items =
        unprocessedItems[tableName]?.map((request) =>
          dynamoDbToItem(writeResponseReader(request)),
        ) ?? [];
      if (items.length) {
        return items;
      }
    }
    return [];
  };

  const failedItems: T[] = [];
  await Promise.all(
    chunks(items, chunkSize)
        .map((chunk, index) => ({ chunk, index }))
        .map((indexedChunk) =>
          writeChunk(indexedChunk.chunk, indexedChunk.index).then(
              (failed) => {
                failedItems.push(...failed);
              })
              .catch((e) => {
            console.error("Failed to %s entities", operationName, e);
            failedItems.push(...indexedChunk.chunk);
        }),
  ))

  return failedItems;
};
