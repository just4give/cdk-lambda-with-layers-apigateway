#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkLambdaApigatewayStack } from "../lib/cdk-lambda-apigateway-stack";
import { AwsSolutionsChecks } from "cdk-nag";

import * as dotenv from "dotenv";
import { CustomNagPack } from "./custom-nagpack";
import { CodePipelineStack } from "../lib/pipeline-stack";
dotenv.config();

const app = new cdk.App();
// cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
cdk.Aspects.of(app).add(new CustomNagPack({ verbose: true }));

const piplelineStack = new CodePipelineStack(app, "CodePipelineStack", {
  description: "CICD Pipeline Stack",
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
});

const apiStack = new CdkLambdaApigatewayStack(app, "Dev-CdkLambdaApigatewayStack", {
  description: "Todo application using CDK App",
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
});
