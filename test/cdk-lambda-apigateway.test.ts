import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as CdkLambdaApigateway from "../lib/cdk-lambda-apigateway-stack";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-lambda-apigateway-stack.ts
test("timeToLiveAttribute set to TTL", () => {
  const app = new cdk.App();

  //write test to check if dynamodb is created with timeToLiveAttribute set to TTL
  // const stack = new CdkLambdaApigateway.CdkLambdaApigatewayStack(app, "MyTestStack", {}, {});

  // const template = Template.fromStack(stack);

  // template.hasResourceProperties("AWS::DynamoDB::Table", {
  //   BillingMode: "PAY_PER_REQUEST",
  // });
});
