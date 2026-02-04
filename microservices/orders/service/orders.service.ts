import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>
  ) {}

  async getOrdersByClienteToken(clienteToken: string): Promise<Order[]> {
    return this.orderModel
      .find({ 
        clienteToken,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllOrdersByClienteToken(clienteToken: string): Promise<Order[]> {
    return this.orderModel
      .find({ clienteToken })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getCompletedOrdersByClienteToken(clienteToken: string): Promise<Order[]> {
    return this.orderModel
      .find({ 
        clienteToken,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOrdersByClienteTokenAndType(clienteToken: string, orderType: 'contado' | 'credito'): Promise<Order[]> {
    return this.orderModel
      .find({ 
        clienteToken,
        orderType,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
