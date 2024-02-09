#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkLambdaApigatewayStack } from "../lib/cdk-lambda-apigateway-stack";
import { AwsSolutionsChecks } from "cdk-nag";

import * as dotenv from "dotenv";
import { CustomNagPack } from "./custom-nagpack";
dotenv.config();

const app = new cdk.App();
// cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
cdk.Aspects.of(app).add(new CustomNagPack({ verbose: true }));
new CdkLambdaApigatewayStack(app, "CdkLambdaApigatewayStack", {
  description: "Todo application using AWS CDK",
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
});
