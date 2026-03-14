import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { ConversationModule } from '../conversation/conversation.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsScenarioController } from './sessions-scenario.controller';

@Module({
  imports: [StorageModule, ConversationModule, AnalyticsModule],
  controllers: [SessionsController, SessionsScenarioController],
  providers: [SessionsService],
})
export class SessionsModule {}
