import { Injectable, Logger } from '@nestjs/common';
import { translate } from 'google-translate-api-x';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  async translateText(text: string, toLang: string = 'km'): Promise<string> {
    try {
      // 'km' is the language code for Khmer in Google Translate
      const res = await translate(text, { to: toLang });
      return res.text;
    } catch (error) {
      this.logger.error(`Translation failed for "${text}": ${error.message}`);
      return text; // Fallback: return original text if translation fails
    }
  }
}