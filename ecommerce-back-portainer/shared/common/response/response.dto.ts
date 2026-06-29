export class ResponseDto<T = any> {
  success: boolean;
  message: string;
  data: T;
  total?: number;

  static ok<T>(
    data: T,
    message = '',
    extra: Record<string, any> = {},
  ): ResponseDto<T> & Record<string, any> {
    return { success: true, message, data, ...extra };
  }

  static fail<T = null>(
    message: string,
    data: T = null as unknown as T,
    extra: Record<string, any> = {},
  ): ResponseDto<T> & Record<string, any> {
    return { success: false, message, data, ...extra };
  }
}
