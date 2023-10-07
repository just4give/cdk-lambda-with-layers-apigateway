import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_kms as kms,
  aws_lambda_nodejs as lambdanodejs,
  aws_apigateway as apigateway,
  aws_dynamodb as dynamodb,
  Duration,
} from "aws-cdk-lib";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class CdkLambdaApigatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //kms key
    const encryptionKey = new kms.Key(this, "todo-basic-key", {
      enableKeyRotation: true,
      alias: "todo-basic-key",
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

    //create the lambda function
    const getTodoLambda = new lambdanodejs.NodejsFunction(this, "getTodoLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(5),
      entry: "lambda/api-get-todo/index.js",
      handler: "handler",
      environment: {
        TABLE_MAIN: mainTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      bundling: {
        nodeModules: [],
        externalModules: ["/opt/nodejs/data-helper"],
      },
      layers: [dbHelperLayer],
    });
    mainTable.grantReadData(getTodoLambda);

    const postTodoLambda = new lambdanodejs.NodejsFunction(this, "postTodoLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(5),
      entry: "lambda/api-post-todo/index.js",
      handler: "handler",
      environment: {
        TABLE_MAIN: mainTable.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      bundling: {
        nodeModules: [],
        externalModules: ["/opt/nodejs/data-helper"],
      },
      layers: [dbHelperLayer],
    });
    mainTable.grantWriteData(postTodoLambda);

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

    new cdk.CfnOutput(this, `httpapidomain`, {
      value: httpApi.apiEndpoint,
      description: "HTTP API domain",
    });
  }
}
