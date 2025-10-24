export class ApiResponse<T = any> {
  status: number;
  success: boolean;
  data: T | null;
  message: string;

  constructor(status: number, data: T | null, message: string) {
    this.status = status;
    this.success = status >= 200 && status < 300;
    this.data = data;
    this.message = message;
  }

  toJSON() {
    return {
      status: this.status,
      success: this.success,
      data: this.data,
      message: this.message,
    };
  }
}

export const createApiResponse = <T = any>(status: number, data: T | null, message: string): ApiResponse<T> => {
  return new ApiResponse(status, data, message);
};
