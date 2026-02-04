import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { OrdersService } from '../service/orders.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('cliente/:clienteToken')
  @ApiOperation({ summary: 'Get all completed orders by cliente token' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No orders found for this client' })
  async getOrdersByClienteToken(@Param('clienteToken') clienteToken: string) {
    try {
      const orders = await this.ordersService.getOrdersByClienteToken(clienteToken);
      
      if (orders.length === 0) {
        throw new HttpException('No completed orders found for this client', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        message: 'Orders retrieved successfully',
        data: orders,
        count: orders.length
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error retrieving orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cliente/:clienteToken/all')
  @ApiOperation({ summary: 'Get all orders by cliente token (including non-completed)' })
  @ApiResponse({ status: 200, description: 'All orders retrieved successfully' })
  async getAllOrdersByClienteToken(@Param('clienteToken') clienteToken: string) {
    try {
      const orders = await this.ordersService.getAllOrdersByClienteToken(clienteToken);
      
      return {
        success: true,
        message: 'All orders retrieved successfully',
        data: orders,
        count: orders.length
      };
    } catch (error) {
      throw new HttpException('Error retrieving orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cliente/:clienteToken/type/:orderType')
  @ApiOperation({ summary: 'Get completed orders by cliente token and order type (contado/credito)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrdersByClienteTokenAndType(
    @Param('clienteToken') clienteToken: string,
    @Param('orderType') orderType: 'contado' | 'credito'
  ) {
    try {
      if (!['contado', 'credito'].includes(orderType)) {
        throw new HttpException('Invalid order type. Must be contado or credito', HttpStatus.BAD_REQUEST);
      }

      const orders = await this.ordersService.getOrdersByClienteTokenAndType(clienteToken, orderType);
      
      if (orders.length === 0) {
        throw new HttpException(`No completed ${orderType} orders found for this client`, HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        message: `${orderType} orders retrieved successfully`,
        data: orders,
        count: orders.length
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error retrieving orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('cliente/:clienteToken/completed')
  @ApiOperation({ summary: 'Get only completed orders by cliente token' })
  @ApiResponse({ status: 200, description: 'Completed orders retrieved successfully' })
  async getCompletedOrdersByClienteToken(@Param('clienteToken') clienteToken: string) {
    try {
      const orders = await this.ordersService.getCompletedOrdersByClienteToken(clienteToken);
      
      if (orders.length === 0) {
        throw new HttpException('No completed orders found for this client', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        message: 'Completed orders retrieved successfully',
        data: orders,
        count: orders.length
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Error retrieving completed orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
