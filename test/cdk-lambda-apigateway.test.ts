import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as CdkLambdaApigateway from "../lib/cdk-lambda-apigateway-stack";

// example test. To run these tests, uncomment this file along with the
// example resource in lib/cdk-lambda-apigateway-stack.ts
test("timeToLiveAttribute set to TTL", () => {
  const app = new cdk.App();
  // WHEN
  //const stack = new CdkLambdaApigateway.CdkLambdaApigatewayStack(app, "CdkLambdaApigatewayStack");
  // THEN
  //const template = Template.fromStack(stack);

  //   template.hasResourceProperties("AWS::DynamoDB::Table", {
  //     timeToLiveAttribute: "TTL",
  //   });
});
