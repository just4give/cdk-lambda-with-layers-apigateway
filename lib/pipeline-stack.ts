import * as cdk from "aws-cdk-lib";
import { BuildSpec, ComputeType } from "aws-cdk-lib/aws-codebuild";
import { Repository } from "aws-cdk-lib/aws-codecommit";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CodeBuildStep, CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from "aws-cdk-lib/pipelines";

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
      pipelineName: "TodoCodePipeline",
      selfMutation: true,
      crossAccountKeys: true,
      enableKeyRotation: true,
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
        commands: ["npm run synth", "ls -lR ./cdk.out"],
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
          commands: ["npm run synth", "ls -lR ./cdk.out", "cfn_nag_scan -i ./cdk.out -t .*.template.json"],
          partialBuildSpec: BuildSpec.fromObject({
            phases: {
              install: {
                "runtime-versions": {
                  ruby: "2.6.0-rc1",
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
          commands: ["echo validated"],
          rolePolicyStatements: [validatePolicy],
        }),
      ],
    });

    // Add test deployment
    const testStage = new Deployment(this, "Test");
    const testStageDeployment = pipeline.addStage(testStage, {
      // Execute validation check for post-deployment
      post: [],
    });

    const testDeploymentValidation = new CodeBuildStep("Validate", {
      env: {
        STAGE: testStage.stageName,
      },
      installCommands: ["npm ci"],
      commands: ["echo validated"],
      rolePolicyStatements: [validatePolicy],
    });
    const testDeploymentManualApproval = new ManualApprovalStep("Approval");

    testStageDeployment.addPost(testDeploymentValidation);
    testStageDeployment.addPost(testDeploymentManualApproval);
    testDeploymentManualApproval.addStepDependency(testDeploymentValidation);

    const prodStage = new Deployment(this, "Prod");

    pipeline.addStage(prodStage, {
      // Execute validation check for post-deployment
      post: [
        new CodeBuildStep("Validate", {
          env: {
            STAGE: prodStage.stageName,
          },
          installCommands: ["npm ci"],
          commands: ["echo validated"],
          rolePolicyStatements: [validatePolicy],
        }),
      ],
    });
  }
}
