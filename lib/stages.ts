import { Stage, type StageProps } from "aws-cdk-lib";
import { type Construct } from "constructs";

import { CdkLambdaApigatewayStack } from "./cdk-lambda-apigateway-stack";

// Main deployment setup. Collection of the stacks and deployment sequence
export class Deployment extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);
    // Deploy the main stack in the Deployment stage
    const apiStack = new CdkLambdaApigatewayStack(
      this,
      "CdkLambdaApigatewayStack",
      {
        description: "Todo application Stack using IaC",
        env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
      },
      props
    );
  }
}
