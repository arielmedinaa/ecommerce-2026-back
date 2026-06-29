import { SQSClient, CreateQueueCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs';

export async function resolveQueueUrl(queueName: string) {
  const region = process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.SQS_ENDPOINT;

  const client = new SQSClient({
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  });

  try {
    const res = await client.send(
      new GetQueueUrlCommand({ QueueName: queueName }),
    );
    return res.QueueUrl as string;
  } catch (error: any) {
    // LocalStack/AWS: create queue if it doesn't exist
    try {
      await client.send(new CreateQueueCommand({ QueueName: queueName }));
      const res = await client.send(
        new GetQueueUrlCommand({ QueueName: queueName }),
      );
      return res.QueueUrl as string;
    } catch (createError) {
      throw error;
    }
  }
}
