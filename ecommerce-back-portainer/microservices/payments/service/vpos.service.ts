import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SingleBuyDto, SingleBuyResponse, RollbackDto, RollbackResponse, ConfirmationResponse } from '../schemas/vpos.schema';
import { createHash } from 'crypto';

@Injectable()
export class VposService {
  private readonly logger = new Logger(VposService.name);
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly returnUrl: string;
  private readonly cancelUrl: string;
  private readonly confirmationUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.configService.get<string>('VPOS_CLAVE_PUBLICA');
    this.privateKey = this.configService.get<string>('VPOS_CLAVE_PRIVADA');
    this.baseUrl = this.configService.get<string>('VPOS_URL_API');
    this.returnUrl = this.configService.get<string>('VPOS_RETURN_URL');
    this.cancelUrl = this.configService.get<string>('VPOS_CANCEL_URL');
    this.confirmationUrl = this.configService.get<string>('VPOS_CONFIRMATION_URL');
  }

  private generateToken(...args: string[]): string {
    const tokenString = args.join('');
    return createHash('md5').update(tokenString).digest('hex');
  }

  private formatAmount(amount: number | string): string {
    return Number(amount).toFixed(2);
  }

  async singleBuy(dto: SingleBuyDto): Promise<SingleBuyResponse> {
    try {
      const amount = this.formatAmount(dto.amount);
      const token = this.generateToken(
        this.privateKey,
        dto.shop_process_id,
        amount,
        dto.currency
      );

      const payload = {
        public_key: this.publicKey,
        operation: {
          token,
          shop_process_id: dto.shop_process_id,
          amount,
          currency: dto.currency,
          additional_data: dto.additional_data || '',
          description: dto.description || '',
          return_url: dto.return_url || this.returnUrl,
          cancel_url: dto.cancel_url || this.cancelUrl,
          zimple: dto.zimple || '',
        },
      };

      const url = `${this.baseUrl}/vpos/api/0.3/single_buy`;
      const response = await axios.post(url, payload, {
        timeout: 30000,
      });

      this.logger.log(`Single Buy exitoso: ${response.data.process_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error en Single Buy: ${error.message}`);
      throw new Error(`Error en Single Buy VPOS: ${error.message}`);
    }
  }

  async singleBuyRollback(dto: RollbackDto): Promise<RollbackResponse> {
    try {
      const token = this.generateToken(
        this.privateKey,
        dto.shop_process_id,
        'rollback',
        '0.00'
      );

      const payload = {
        public_key: this.publicKey,
        operation: {
          token,
          shop_process_id: dto.shop_process_id,
        },
      };

      const url = `${this.baseUrl}/vpos/api/0.3/single_buy/rollback`;
      const response = await axios.post(url, payload);

      this.logger.log(`Rollback exitoso: ${dto.shop_process_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error en Rollback: ${error.message}`);
      throw new Error(`Error en Rollback VPOS: ${error.message}`);
    }
  }

  async getSingleBuyConfirmation(shopProcessId: string): Promise<ConfirmationResponse> {
    try {
      const token = this.generateToken(
        this.privateKey,
        shopProcessId,
        'get_confirmation'
      );

      const payload = {
        public_key: this.publicKey,
        operation: {
          token,
          shop_process_id: shopProcessId,
        },
      };

      const url = `${this.baseUrl}/vpos/api/0.3/single_buy/confirmations`;
      const response = await axios.post(url, payload);

      this.logger.log(`Confirmación obtenida: ${shopProcessId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error obteniendo confirmación: ${error.message}`);
      throw new Error(`Error obteniendo confirmación VPOS: ${error.message}`);
    }
  }

  verifyConfirmationToken(operation: {
    token: string;
    shop_process_id: string;
    amount: string | number;
    currency: string;
  }): boolean {
    const expected = this.generateToken(
      this.privateKey,
      String(operation.shop_process_id),
      'confirm',
      this.formatAmount(operation.amount),
      operation.currency,
    );
    return expected === operation.token;
  }
}
