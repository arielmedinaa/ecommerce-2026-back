import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { SqsService } from '@shared/common/queue/sqs/sqs.service';
import { resolveQueueUrl } from '@shared/common/queue/sqs/sqs.util';
import { PaymentsService } from '../service/payments.service';

@Injectable()
export class PaymentsSqsWorker implements OnModuleDestroy {
  private readonly logger = new Logger(PaymentsSqsWorker.name);
  private stopped = false;
  private loopPromise?: Promise<void>;
  private queueUrl?: string;

  constructor(
    private readonly sqs: SqsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async start() {
    if (this.loopPromise) return;
    const enabled = String(process.env.PAYMENTS_SQS_WORKER_ENABLED || 'true').toLowerCase() === 'true';
    if (!enabled) {
      this.logger.warn('SQS worker disabled by env PAYMENTS_SQS_WORKER_ENABLED');
      return;
    }

    const name = process.env.PAYMENTS_SQS_QUEUE_NAME || 'payments-jobs';
    this.queueUrl = await resolveQueueUrl(name);
    this.logger.log(`SQS worker started for queue ${name}`);
    this.loopPromise = this.loop();
  }

  async onModuleDestroy() {
    this.stopped = true;
    await this.loopPromise;
  }

  private async loop() {
    while (!this.stopped) {
      try {
        const messages = await this.sqs.receive(this.queueUrl!, 10, 10);
        if (messages.length === 0) continue;

        for (const msg of messages) {
          await this.handleMessage(msg);
          if (msg.ReceiptHandle) {
            await this.sqs.delete(this.queueUrl!, msg.ReceiptHandle);
          }
        }
      } catch (err) {
        this.logger.error('Worker loop error', err?.stack || err);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private async handleMessage(msg: any) {
    const raw = msg.Body || '{}';
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      body = { raw };
    }

    if (body?.type === 'payment_intent_created' && body?.idIntentoPago) {
      const idIntentoPago = String(body.idIntentoPago);
      await this.paymentsService.marcarIntentoComoProcesando(idIntentoPago);

      const simulateFail =
        String(process.env.PSP_SIMULATE_FAILURE || 'false').toLowerCase() ===
        'true';

      const maxRetries = Number(process.env.PSP_MAX_RETRIES || 5);
      const baseDelayMs = Number(process.env.PSP_RETRY_DELAY_MS || 5000);

      if (simulateFail) {
        const intent = await this.paymentsService.registrarFalloIntento(
          idIntentoPago,
          'Simulación: fallo de conexión con PSP',
          new Date(Date.now() + baseDelayMs),
        );

        const attempts = intent?.intentosReintento || 0;
        if (attempts >= maxRetries) {
          await this.paymentsService.actualizarEstadoIntentoPago(
            idIntentoPago,
            'fallido',
            'Simulación: excedió reintentos',
          );
          this.logger.warn({
            event: 'payment_intent_failed',
            idIntentoPago,
            attempts,
          });
          return;
        }

        // Re-enqueue with exponential backoff (basic)
        const delayMs = Math.min(60000, baseDelayMs * Math.max(1, attempts));
        await this.sqs.sendJsonWithDelay(
          this.queueUrl!,
          {
            type: 'payment_intent_created',
            idIntentoPago,
            ts: new Date().toISOString(),
            retry: attempts,
          },
          Math.ceil(delayMs / 1000),
        );

        this.logger.warn({
          event: 'payment_intent_retry_enqueued',
          idIntentoPago,
          attempts,
        });
        return;
      }

      // Simulated success: mark completed + write final payment record
      await this.paymentsService.actualizarEstadoIntentoPago(
        idIntentoPago,
        'completado',
      );
      const pago = await this.paymentsService.registrarPagoDesdeIntento(
        idIntentoPago,
      );

      this.logger.log({
        event: 'payment_intent_completed',
        idIntentoPago,
        paymentId: pago?.id,
      });
      return;
    }

    this.logger.warn({ msg: 'Unhandled SQS message', body });
  }
}
