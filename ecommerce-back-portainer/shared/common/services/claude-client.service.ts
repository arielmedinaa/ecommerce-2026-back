import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.ETL_CLAUDE_MODEL || 'claude-sonnet-5';

@Injectable()
export class ClaudeClientService {
  private readonly logger = new Logger(ClaudeClientService.name);
  private readonly client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY no configurada: el agente de ETL no podrá generar integraciones.');
    }
    this.client = new Anthropic({ apiKey });
  }

  async ask(system: string, prompt: string, maxTokens = 8192): Promise<string> {
    const start = Date.now();
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    this.logger.log(`Claude respondió en ${Date.now() - start}ms (prompt ~${prompt.length} chars)`);
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  // Pide una respuesta JSON estricta (usada para el descubrimiento de
  // auth/baseUrl). Reintenta una vez si el JSON no parsea.
  async askJson<T>(system: string, prompt: string): Promise<T> {
    const raw = await this.ask(system, `${prompt}\n\nRespondé ÚNICAMENTE con JSON válido, sin texto adicional ni markdown.`);
    try {
      return JSON.parse(this.stripCodeFences(raw)) as T;
    } catch {
      const retry = await this.ask(
        system,
        `Tu respuesta anterior no era JSON válido. Respondé de nuevo, SOLO el JSON, sin explicaciones ni backticks.\n\nPedido original:\n${prompt}`,
      );
      return JSON.parse(this.stripCodeFences(retry)) as T;
    }
  }

  private stripCodeFences(text: string): string {
    return text.replace(/^```(json)?/gm, '').replace(/```$/gm, '').trim();
  }
}
