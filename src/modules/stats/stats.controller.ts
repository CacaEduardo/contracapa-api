import { Controller, Get } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { StatsService } from 'src/modules/stats/stats.service';

@Controller('admin/stats')
@Roles('admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
