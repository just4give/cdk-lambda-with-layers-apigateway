const dbhelper = require("/opt/nodejs/data-helper");

const handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const { email, todo } = JSON.parse(event.body);

  let response = {
    statusCode: 201,
  };
  try {
    const r = await dbhelper.addTodo(email, todo, new Date().getTime(), 30);
  } catch (error) {
    console.log(error);
    response.statusCode = 500;
  }
  return response;
};
module.exports = { handler };
