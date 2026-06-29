import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);

  private client() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.SQS_ENDPOINT;

    return new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });
  }

  async sendJson(queueUrl: string, payload: any, messageGroupId?: string) {
    const body = JSON.stringify(payload ?? {});
    const client = this.client();
    const cmd = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: body,
      ...(messageGroupId ? { MessageGroupId: messageGroupId } : {}),
    });
    return await client.send(cmd);
  }

  async sendJsonWithDelay(
    queueUrl: string,
    payload: any,
    delaySeconds: number,
  ) {
    const body = JSON.stringify(payload ?? {});
    const client = this.client();
    const cmd = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: body,
      DelaySeconds: Math.max(0, Math.min(900, Math.floor(delaySeconds))),
    });
    return await client.send(cmd);
  }

  async receive(queueUrl: string, maxMessages: number = 10, waitSeconds: number = 10) {
    const client = this.client();
    const cmd = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: Math.max(1, Math.min(10, maxMessages)),
      WaitTimeSeconds: Math.max(0, Math.min(20, waitSeconds)),
      VisibilityTimeout: 30,
    });
    const res = await client.send(cmd);
    return res.Messages || [];
  }

  async delete(queueUrl: string, receiptHandle: string) {
    const client = this.client();
    const cmd = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });
    return await client.send(cmd);
  }

  logError(message: string, error: any) {
    this.logger.error(message, error?.stack || error);
  }
}
