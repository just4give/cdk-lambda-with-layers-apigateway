import * as cdk from "aws-cdk-lib";
import { BuildSpec, ComputeType } from "aws-cdk-lib/aws-codebuild";
import { Repository } from "aws-cdk-lib/aws-codecommit";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep } from "aws-cdk-lib/pipelines";

import { Construct } from "constructs";
import { Deployment } from "./stages";

export class CodePipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repo = new Repository(this, "Repository", {
      repositoryName: "cdk-lambda-with-layers-apigateway",
      description: "dynamodb lambda layers with aws cdk.",
    });

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: "TodoCorePipeline",
      selfMutation: false,
      //   synth: new CodeBuildStep("build", {
      //     input: CodePipelineSource.gitHub("just4give/cdk-lambda-with-layers-apigateway", "master", {
      //       authentication: cdk.SecretValue.secretsManager("GITHUB_TOKEN"),
      //     }),
      //     commands: ["npm install -g esbuild", "npm ci", "npm run synth"],
      //     buildEnvironment: {
      //       computeType: ComputeType.LARGE,
      //     },
      //     rolePolicyStatements: [
      //       new PolicyStatement({
      //         effect: Effect.ALLOW,
      //         actions: ["*"],
      //         resources: ["*"],
      //       }),
      //     ],
      //   }),
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.gitHub("just4give/cdk-lambda-with-layers-apigateway", "master", {
          authentication: cdk.SecretValue.secretsManager("GITHUB_TOKEN"),
        }),
        installCommands: ["npm install -g esbuild", "npm ci"],
        commands: ["npm run synth"],
      }),
    });

    const validatePolicy = new PolicyStatement({
      actions: ["cloudformation:DescribeStacks", "events:DescribeEventBus"],
      resources: ["*"],
    });

    // Add dev deployment
    const devStage = new Deployment(this, "Dev");

    pipeline.addStage(devStage, {
      // Execute all sequence of actions before deployment
      pre: [
        new CodeBuildStep("UnitTest", {
          installCommands: ["npm ci"],
          commands: ["npm run test"],

          rolePolicyStatements: [
            new PolicyStatement({
              actions: [
                "codebuild:CreateReportGroup",
                "codebuild:CreateReport",
                "codebuild:UpdateReport",
                "codebuild:BatchPutTestCases",
                "codebuild:BatchPutCodeCoverages",
              ],
              resources: ["*"],
            }),
          ],
        }),
        new CodeBuildStep("Security", {
          installCommands: ["npm ci", "gem install cfn-nag"],
          commands: ["npm run synth", "cfn_nag_scan -i ./cdk.out -t .*.template.json"],
          partialBuildSpec: BuildSpec.fromObject({
            phases: {
              install: {
                "runtime-versions": {
                  ruby: "2.6",
                },
              },
            },
          }),
        }),
      ],
      // Execute validation check for post-deployment
      post: [
        new CodeBuildStep("Validate", {
          env: {
            STAGE: devStage.stageName,
          },
          installCommands: ["npm ci"],
          commands: [],
          rolePolicyStatements: [validatePolicy],
        }),
      ],
    });

    //output repository
    // new cdk.CfnOutput(this, "RepositoryName", {
    //   value: repo.repositoryName,
    // });
  }
}
