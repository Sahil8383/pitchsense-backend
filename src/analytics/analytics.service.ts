import { Injectable } from '@nestjs/common';
import type { Message } from '../common/interfaces';
import type { AnalyticsPayload } from '../common/interfaces';
import { FILLER_WORDS } from '../common/constants';

@Injectable()
export class AnalyticsService {
  compute(
    messages: Message[],
    lastSellerIndex: number,
    buyerInterestPercent: number | null = null,
  ): AnalyticsPayload {
    const lastSeller = messages[lastSellerIndex];
    const lastSellerText =
      lastSeller?.role === 'seller' ? (lastSeller.content ?? '') : '';
    const lastSellerWordCount = this.wordCount(lastSellerText);

    let fillerWordCount = 0;
    if (lastSellerText) {
      fillerWordCount = this.countFillerWords(lastSellerText);
    }

    let fillerWordTotal = 0;
    for (const m of messages) {
      if (m.role === 'seller' && m.content)
        fillerWordTotal += this.countFillerWords(m.content);
    }

    let sellerWords = 0;
    let buyerWords = 0;
    for (const m of messages) {
      const w = this.wordCount(m.content);
      if (m.role === 'seller') sellerWords += w;
      else buyerWords += w;
    }

    return {
      fillerWordCount,
      fillerWordTotal,
      talkRatio: { seller: sellerWords, buyer: buyerWords },
      monologueFlag: lastSellerWordCount > 150,
      messageIndex: lastSellerIndex,
      buyerInterestPercent,
    };
  }

  private wordCount(text: string): number {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  private countFillerWords(text: string): number {
    const lower = text.toLowerCase();
    let count = 0;
    for (const word of FILLER_WORDS) {
      const re = new RegExp(
        word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'),
        'gi',
      );
      const matches = lower.match(re);
      if (matches) count += matches.length;
    }
    return count;
  }
}
