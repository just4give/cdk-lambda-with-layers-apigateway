#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkLambdaApigatewayStack } from "../lib/cdk-lambda-apigateway-stack";

const app = new cdk.App();
new CdkLambdaApigatewayStack(app, "CdkLambdaApigatewayStack", {
  description: "Todo application using AWS CDK",
  env: { account: "027378352884", region: "us-east-2" },
});
