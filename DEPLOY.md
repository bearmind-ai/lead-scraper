# Deployment auf AWS Lambda

## Voraussetzungen

- AWS CLI v2 installiert (`aws --version`)
- `zip` installiert
- Node.js 22.x lokal
- AWS-Account mit Berechtigungen: `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PassRole`, `lambda:*`, `apigateway:*`, `logs:*`

## 1. AWS CLI konfigurieren

```bash
aws configure
# AWS Access Key ID: ...
# AWS Secret Access Key: ...
# Default region name: eu-central-1
# Default output format: json

aws sts get-caller-identity
```

## 2. Deployment-Paket bauen

```bash
./build.sh
# -> deployment.zip im Projekt-Root
```

## 3. IAM Execution Role

```bash
aws iam create-role \
  --role-name lead-scraper-lambda-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name lead-scraper-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## 4. Lambda-Funktion anlegen

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
GOOGLE_KEY=$(grep GOOGLE_MAPS_API_KEY .env | cut -d= -f2-)

aws lambda create-function \
  --function-name lead-scraper \
  --runtime nodejs22.x \
  --role arn:aws:iam::$ACCOUNT_ID:role/lead-scraper-lambda-role \
  --handler handler.handler \
  --timeout 300 \
  --memory-size 512 \
  --zip-file fileb://deployment.zip \
  --environment "Variables={GOOGLE_MAPS_API_KEY=$GOOGLE_KEY}"
```

Update nach Code-Änderung:

```bash
./build.sh
aws lambda update-function-code \
  --function-name lead-scraper \
  --zip-file fileb://deployment.zip
```

## 5. HTTP API Gateway

```bash
API_ID=$(aws apigatewayv2 create-api \
  --name lead-scraper-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="POST,OPTIONS",AllowHeaders="Content-Type" \
  --query ApiId --output text)

LAMBDA_ARN=$(aws lambda get-function --function-name lead-scraper --query Configuration.FunctionArn --output text)

INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $LAMBDA_ARN \
  --payload-format-version 2.0 \
  --query IntegrationId --output text)

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /scrape" \
  --target integrations/$INTEGRATION_ID

aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name '$default' \
  --auto-deploy

REGION=$(aws configure get region)
aws lambda add-permission \
  --function-name lead-scraper \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/scrape"

echo "Invoke URL: https://$API_ID.execute-api.$REGION.amazonaws.com/scrape"
```

## 6. Test

```bash
curl -X POST https://<API_ID>.execute-api.<REGION>.amazonaws.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"searchTerm":"Zahnarzt","city":"München","maxLeads":5}'
```

## Logs

```bash
aws logs tail /aws/lambda/lead-scraper --follow
```
