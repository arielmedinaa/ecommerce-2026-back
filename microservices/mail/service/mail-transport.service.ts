import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

export const LOGO_CID = 'logo-centralshop';
const LOGO_PATH = join(__dirname, '..', 'assets', 'images', 'logo-centralshop.png');

@Injectable()
export class MailTransportService implements OnModuleInit {
  private readonly logger = new Logger(MailTransportService.name);
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: process.env.CORREO_SERVER,
      port: Number(process.env.CORREO_PORT || 587),
      secure: Number(process.env.CORREO_PORT || 587) === 465,
      auth: {
        user: process.env.CORREO_CUENTA,
        pass: process.env.CORREO_PASS,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('No se pudo verificar la conexión SMTP', error);
      } else {
        this.logger.log('Conexión SMTP verificada correctamente');
      }
    });
  }

  async send(to: string, subject: string, html: string): Promise<boolean> {
    if (!to) {
      this.logger.warn(`Envío omitido: destinatario vacío (asunto: ${subject})`);
      return false;
    }
    const from = `"${process.env.CORREO_NOMBRE || 'Central Shop'}" <${process.env.CORREO_CUENTA}>`;
    const attachments = [
      { filename: 'logo-centralshop.png', path: LOGO_PATH, cid: LOGO_CID },
    ];
    try {
      await this.transporter.sendMail({ from, to, subject, html, attachments });
      this.logger.log(`Correo enviado a ${to}: ${subject}`);
      return true;
    } catch (error) {
      this.logger.warn(`Fallo al enviar a ${to}, reintentando una vez`, error);
      try {
        await this.transporter.sendMail({ from, to, subject, html, attachments });
        this.logger.log(`Correo enviado a ${to} en el reintento: ${subject}`);
        return true;
      } catch (retryError) {
        this.logger.error(`Fallo definitivo al enviar a ${to}: ${subject}`, retryError);
        return false;
      }
    }
  }
}
