export class SingleBuyDto {
  shop_process_id: string;
  amount: number;
  currency: string;
  description?: string;
  return_url: string;
  cancel_url: string;
  additional_data?: string;
  zimple?: string;
}

export class SingleBuyResponse {
  status: string;
  process_id: string;
}

export class RollbackDto {
  shop_process_id: string;
}

export class RollbackResponse {
  status: string;
  messages: string[];
}

export class ConfirmationDto {
  shop_process_id: string;
  amount: number;
  currency: string;
  confirmation_date: string;
  response_code: string;
  response_message: string;
  card_brand: string;
  card_number: string;
}

export class ConfirmationResponse {
  status: string;
  confirmation: ConfirmationDto;
  messages: string[];
}
