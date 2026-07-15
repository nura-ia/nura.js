export class ContextManager {
  private value: unknown
  save(value: unknown): void { this.value = value }
  getLast(): unknown { return this.value }
}
