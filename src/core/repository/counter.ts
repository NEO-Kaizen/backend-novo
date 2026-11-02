export interface Counter {
  next(name: string): Promise<number>;
}