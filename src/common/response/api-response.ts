export class ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T | null;

  private constructor(success: boolean, message: string, data: T | null) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  /** 200 OK — operation succeeded */
  static ok<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  /** 201 Created — resource created successfully */
  static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  /** Used internally by the global exception filter for error shapes */
  static error(message: string): ApiResponse<null> {
    return new ApiResponse<null>(false, message, null);
  }
}
