"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const home_controller_1 = require("./home.controller");
describe('HomeController', () => {
    let controller;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [home_controller_1.HomeController],
        }).compile();
        controller = module.get(home_controller_1.HomeController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
//# sourceMappingURL=home.controller.spec.js.map