export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string, public readonly errors: any[] = []) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  abstract serializeErrors(): { message: string; fields?: any[] };
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  constructor(message: string = 'Bad Request', errors: any[] = []) {
    super(message, errors);
  }
  serializeErrors() {
    return { message: this.message, fields: this.errors };
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  constructor(message: string = 'Validation Failed', errors: any[] = []) {
    super(message, errors);
  }
  serializeErrors() {
    return { message: this.message, fields: this.errors };
  }
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  constructor(message: string = 'Authentication Failed') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}

export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  constructor(message: string = 'Not Authorized') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  constructor(message: string = 'Access Forbidden') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  constructor(message: string = 'Resource Not Found') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  constructor(message: string = 'Resource Conflict') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  constructor(message: string = 'Internal Server Error') {
    super(message);
  }
  serializeErrors() {
    return { message: this.message };
  }
}
