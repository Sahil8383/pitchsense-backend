import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { StorageModule } from './storage/storage.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { EvaluationsModule } from './evaluations/evaluations.module.js';
import { ConversationModule } from './conversation/conversation.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    ScenariosModule,
    SessionsModule,
    EvaluationsModule,
    ConversationModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
