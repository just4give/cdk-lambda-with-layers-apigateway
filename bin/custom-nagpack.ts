import { CfnResource, Stack } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { NagMessageLevel, NagPack, NagPackProps, NagRuleCompliance, rules } from "cdk-nag";
import { CfnTable } from "aws-cdk-lib/aws-dynamodb";
import { CfnStage as CfnV2Stage } from "aws-cdk-lib/aws-apigatewayv2";

export class CustomNagPack extends NagPack {
  constructor(props?: NagPackProps) {
    super(props);
    this.packName = "CustomNagPack";
  }
  public visit(node: IConstruct): void {
    //this rule is inherited from cdk-nag
    if (node instanceof CfnV2Stage) {
      this.applyRule({
        ruleSuffixOverride: "APIG1",
        info: "The API does not have access logging enabled.",
        explanation:
          "Enabling access logs helps operators view who accessed an API and how the caller accessed the API.",
        level: NagMessageLevel.ERROR,
        rule: rules.apigw.APIGWAccessLogging,
        node: node,
      });
    }

    if (node instanceof CfnTable) {
      //write custom rule to make sure all tables has TTLenabled.
      this.applyRule({
        ruleSuffixOverride: "DDB2",
        info: "The DynamoDB table does not have Time To Live enabled.",
        explanation:
          "DynamoDB TTL is a feature that automatically deletes items from a table after a specified time period. The TTL feature is useful for ensuring that data is not stored indefinitely.",
        level: NagMessageLevel.ERROR,

        node: node,
        rule: function (node: CfnTable) {
          const ttl = Stack.of(node).resolve(node.timeToLiveSpecification);

          if (ttl && ttl.enabled === true) {
            return NagRuleCompliance.COMPLIANT;
          } else {
            return NagRuleCompliance.NON_COMPLIANT;
          }
        },
      });
    }
  }
}
