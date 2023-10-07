const dbhelper = require("/opt/nodejs/data-helper");

const handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const email = event["pathParameters"]["email"];

  let response = {
    statusCode: 200,
  };

  try {
    let items = await dbhelper.getTodoByUserid(email);

    response.body = JSON.stringify(items);
  } catch (error) {
    console.log(error);
    response.statusCode = 500;
  }

  return response;
};
module.exports = { handler };
