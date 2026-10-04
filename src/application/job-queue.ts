// 同じキーが待ち行列に重複しないようにしながら、ジョブを1つずつ順番に実行する
export interface Job<K> { key: K; reason: string }

export class JobQueue<K> {
  private jobs: Job<K>[] = [];
  private queuedKeys = new Set<K>();
  private running = false;
  private runJob: (job: Job<K>) => Promise<void>;
  private isValid: (key: K) => boolean;
  private onQueued?: (key: K) => void;

  constructor(
    runJob: (job: Job<K>) => Promise<void>,
    isValid: (key: K) => boolean = () => true,
    onQueued?: (key: K) => void,
  ) {
    this.runJob = runJob;
    this.isValid = isValid;
    this.onQueued = onQueued;
  }

  get size(): number { return this.jobs.length; }

  has(key: K): boolean { return this.queuedKeys.has(key); }

  enqueue(key: K, reason: string): boolean {
    if (this.queuedKeys.has(key)) return false;
    this.queuedKeys.add(key);
    this.jobs.push({ key, reason });
    this.onQueued?.(key);
    void this.drain();
    return true;
  }

  clear(): void {
    this.jobs.length = 0;
    this.queuedKeys.clear();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.jobs.length > 0) {
        const job = this.jobs.shift()!;
        this.queuedKeys.delete(job.key);
        if (!this.isValid(job.key)) continue;   // 待っている間に削除された
        try {
          await this.runJob(job);
        } catch (err) {
          console.error(err);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
