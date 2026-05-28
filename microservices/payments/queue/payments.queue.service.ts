import { Injectable, Logger } from '@nestjs/common';
import { SqsService } from '@shared/common/queue/sqs/sqs.service';
import { resolveQueueUrl } from '@shared/common/queue/sqs/sqs.util';

@Injectable()
export class PaymentsQueueService {
  private readonly logger = new Logger(PaymentsQueueService.name);
  private queueUrl?: string;

  constructor(private readonly sqs: SqsService) {}

  private async getQueueUrl() {
    if (this.queueUrl) return this.queueUrl;
    const name = process.env.PAYMENTS_SQS_QUEUE_NAME || 'payments-jobs';
    this.queueUrl = await resolveQueueUrl(name);
    return this.queueUrl;
  }

  async enqueuePaymentIntentCreated(idIntentoPago: string) {
    try {
      const queueUrl = await this.getQueueUrl();
      await this.sqs.sendJson(queueUrl, {
        type: 'payment_intent_created',
        idIntentoPago,
        ts: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to enqueue payment job', error?.stack || error);
      return false;
    }
  }
}
