import { Test, TestingModule } from '@nestjs/testing';
import { HomeService } from './home.service';
import { ImageService } from '../../image/image.service';
import { FilterHomeDto } from '../dto/filter.home';

class MockImageService {
  getImageUrl = jest.fn().mockImplementation((filename) => `http://localhost:3002/images/${filename}`);
}

describe('HomeService', () => {
  let service: HomeService;
  let imageService: ImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeService,
        { provide: ImageService, useClass: MockImageService }
      ],
    }).compile();

    service = module.get<HomeService>(HomeService);
    imageService = module.get<ImageService>(ImageService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getHomeData', () => {
    it('debería retornar datos del home con productos paginados', async () => {
      const filter: FilterHomeDto = {
        limit: 2,
        offset: 0
      };

      const result = await service.getHomeData(filter);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('register');

      expect(result.data).toHaveProperty('banners');
      expect(result.data).toHaveProperty('productos');
      expect(result.data).toHaveProperty('categorias');
      expect(result.data.productos.length).toBeLessThanOrEqual(2);
    });

    it('debería filtrar por categoría cuando se especifica', async () => {
      const filter: FilterHomeDto = {
        category: 'electronics'
      };

      const result = await service.getHomeData(filter);
      const allElectronics = result.data.productos.every(
        (p) => p.category === 'electronics'
      );
      expect(allElectronics).toBeTruthy();
    });

    it('debería retornar un mensaje de éxito', async () => {
      const result = await service.getHomeData({});
      expect(result.message).toContain('successfully');
    });
  });
});