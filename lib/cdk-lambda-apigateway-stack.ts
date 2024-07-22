import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_kms as kms,
  aws_lambda_nodejs as lambdanodejs,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  Duration,
} from "aws-cdk-lib";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { CfnStage as CfnV2Stage } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { NagSuppressions } from "cdk-nag";

export class CdkLambdaApigatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, stageProps?: cdk.StageProps) {
    super(scope, id, props);

    //kms key
    const encryptionKey = new kms.Key(this, "todo-basic-key", {
      enableKeyRotation: true,
    });

    //create dynamodb table
    const mainTable = new dynamodb.Table(this, "todo-single-table", {
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "TTL",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: encryptionKey,
    });

    mainTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "GSI1PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: dynamodb.AttributeType.STRING,
      },
    });

    const dbHelperLayer = new lambda.LayerVersion(this, "db-helper-layer", {
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      code: lambda.Code.fromAsset("lambda/db-helper-layer"),
      description: "Dynamo related commmon code and access patterns",
    });

    // Attach the policy to the role
    const getDefaultLambdaPolicy = new iam.Policy(this, "TodoAccessPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
          resources: [mainTable.tableArn],
        }),
        new iam.PolicyStatement({
          actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
          resources: ["*"],
        }),
      ],
    });

    // Define an IAM role for the Lambda function
    const getTodolambdaRole = new iam.Role(this, "GetTodoLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });

    getTodolambdaRole.attachInlinePolicy(getDefaultLambdaPolicy);
    encryptionKey.grantDecrypt(getTodolambdaRole);

    NagSuppressions.addResourceSuppressions(
      getDefaultLambdaPolicy,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Exception is made for Lambda Loggroup ",
          appliesTo: ["Resource::*"],
        },
      ],
      true
    );

    //NagSuppressions.addStackSuppressions(this, [{ id: "AwsSolutions-IAM5", reason: "lorem ipsum" }]);

    //supress cdk-nag rule AwsSolutions-IAM5 for TodoAccessPolicy

    //create the lambda function
    const getTodoLambda = new lambdanodejs.NodejsFunction(this, "getTodoLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(5),
      entry: "lambda/api-get-todo/index.js",
      handler: "handler",
      environment: {
        TABLE_MAIN: mainTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        ENV_NAME: stageProps?.stageName || "NA",
      },
      bundling: {
        nodeModules: [],
        externalModules: ["/opt/nodejs/data-helper"],
      },
      layers: [dbHelperLayer],
      role: getTodolambdaRole,
    });

    const postTodoLambda = new lambdanodejs.NodejsFunction(this, "postTodoLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(5),
      entry: "lambda/api-post-todo/index.js",
      handler: "handler",
      environment: {
        TABLE_MAIN: mainTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        ENV_NAME: stageProps?.stageName || "NA",
      },
      bundling: {
        nodeModules: [],
        externalModules: ["/opt/nodejs/data-helper"],
      },
      layers: [dbHelperLayer],
    });
    mainTable.grantWriteData(postTodoLambda);

    NagSuppressions.addResourceSuppressions(
      postTodoLambda,
      [
        {
          id: "AwsSolutions-IAM4",
          reason: "Allow AWSLambdaBasicExecutionRole for lambdas ",
          appliesTo: ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],
        },
        {
          id: "AwsSolutions-IAM5",
          reason: "Allow wildcard permissions Lambda Log Group ",
        },
      ],
      true
    );

    //create HTTP API
    const httpApi = new apigwv2.HttpApi(this, "todo-http-api", {
      description: "HTTP API For TODO application",
      corsPreflight: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization", "X-Api-Key"],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowCredentials: false,
        allowOrigins: ["*"],
      },
    });
    //enable access logging for httpApi
    const accessLogs = new cdk.aws_logs.LogGroup(this, "APIGW-AccessLogs");
    const stage = httpApi.defaultStage?.node.defaultChild as CfnV2Stage;
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        userAgent: "$context.identity.userAgent",
        sourceIp: "$context.identity.sourceIp",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        path: "$context.path",
        status: "$context.status",
        responseLength: "$context.responseLength",
      }),
    };

    NagSuppressions.addStackSuppressions(this, [
      { id: "AwsSolutions-APIG4", reason: "Authorization is not yet implemented for this app." },
    ]);

    httpApi.addRoutes({
      path: "/todo/{email}",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration("getTodoLambdaIntegration", getTodoLambda),
    });

    httpApi.addRoutes({
      path: "/todo",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration("postTodoLambdaIntegration", postTodoLambda),
    });

    new cdk.CfnOutput(this, `apiEndpoint`, {
      value: httpApi.apiEndpoint,
      description: "HTTP API Endpoint",
    });
  }
}
