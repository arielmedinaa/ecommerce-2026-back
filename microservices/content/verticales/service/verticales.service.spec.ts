import { Test, TestingModule } from '@nestjs/testing';
import { VerticalesService } from './verticales.service';

describe('VerticalesService', () => {
  let service: VerticalesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerticalesService],
    }).compile();

    service = module.get<VerticalesService>(VerticalesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
