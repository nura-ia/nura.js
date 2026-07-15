declare module 'express' {
  export interface Request {
    method: string
    headers: Record<string, string | string[] | undefined> & {
      accept?: string
      origin?: string
    }
    body: unknown
    params: Record<string, string>
    ip?: string
    accepts(type: string): string | false | null
    is(type: string): string | false | null
    header(name: string): string | undefined
  }

  export interface Response {
    header(name: string, value: string): this
    sendStatus(status: number): this
    status(status: number): this
    json(body: unknown): this
  }

  export type NextFunction = (error?: unknown) => void
  export type RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => unknown
  export type ErrorRequestHandler = (
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => unknown

  export interface Router {
    use(...handlers: RequestHandler[]): this
    use(...handlers: ErrorRequestHandler[]): this
    post(path: string, ...handlers: RequestHandler[]): this
    get(path: string, ...handlers: RequestHandler[]): this
  }

  export function Router(): Router
  export function json(options?: { limit?: string }): RequestHandler
}
