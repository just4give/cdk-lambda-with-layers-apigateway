const { ListTablesCommand, DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
const MAIN_TABLE_NAME = process.env.TABLE_MAIN;

const putItemInDB = async (tableName, input) => {
  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: input,
    });

    const response = await docClient.send(command);
    console.log(`Response code ${response.$metadata.httpStatusCode}`);
  } catch (error) {
    throw error;
  }
};

const addTodo = async (email, todo, timestamp, ttlInDays) => {
  const input = {
    PK: `USER#${email}`,
    SK: `TODO#${timestamp}`,
    GSI1PK: `USER#${email}`,
    GSI1SK: `TODO#${timestamp}`,
    EntityType: "TODO",
    Checked: false,
    Todo: todo,
    TTL: new Date().getTime() / 1000 + 3600 * 24 * ttlInDays,
  };

  await putItemInDB(MAIN_TABLE_NAME, input);
};

const getTodoByUserid = async (email) => {
  try {
    const command = new QueryCommand({
      TableName: MAIN_TABLE_NAME,
      KeyConditionExpression: "PK = :PK AND begins_with(SK, :SK) ",
      ExpressionAttributeValues: {
        ":PK": `USER#${email}`,
        ":SK": `TODO#`,
      },
      ConsistentRead: false,
      ReturnConsumedCapacity: "INDEXES",
    });

    const response = await docClient.send(command);
    console.log("Consumed capacity:", response.ConsumedCapacity);
    console.log("Count:", response.Count);
    const runtimes = response.Items;

    return runtimes;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  putItemInDB,
  addTodo,
  getTodoByUserid,
};
