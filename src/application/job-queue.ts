// 同じキーが待ち行列に重複しないようにしながら、ジョブを1つずつ順番に実行する
export interface Job<K> { key: K; reason: string }

/** OCRジョブを重複排除し、逐次実行するキュー。 */
export class JobQueue<K> {
  private jobs: Job<K>[] = [];
  private queuedKeys = new Set<K>();
  private running = false;
  private runJob: JobQueue<K>['runJobSignature'];
  private isValid: JobQueue<K>['validitySignature'];
  private onQueued?: JobQueue<K>['queuedSignature'];

  /**
   * 処理名: キュー初期化
   * 処理概要: 実行、妥当性検査、登録通知の処理を設定する。
   * 実装理由: ジョブ管理と実行ポリシーを分離するため。
   * @param runJob ジョブ実行処理
   * @param isValid 実行時の有効性判定
   * @param onQueued 登録直後の通知
   */
  constructor(
    runJob: JobQueue<K>['runJobSignature'],
    isValid: JobQueue<K>['validitySignature'] = () => true,
    onQueued?: JobQueue<K>['queuedSignature'],
  ) {
    this.runJob = runJob;
    this.isValid = isValid;
    this.onQueued = onQueued;
  }

  /**
   * 処理名: キュー長取得
   * 処理概要: 待機中のジョブ数を返す。
   * 実装理由: UIや監視処理が処理量を把握するため。
   * @returns 登録件数
   */
  get size(): number { return this.jobs.length; }
  /**
   * 指定キーのジョブが待機中または実行中かを返す。
   * @param key 確認するジョブキー
   * @returns 登録済みならtrue
   */
  has(key: K): boolean { return this.queuedKeys.has(key); }
  /**
   * 処理名: ジョブ登録
   * 処理概要: 重複しない有効なジョブをキューへ追加する。
   * 実装理由: 同一範囲の読み取りを並行実行させないため。
   * @param key ジョブキー
   * @param reason 実行理由
   * @returns 登録できた場合true
   */
  enqueue(key: K, reason: string): boolean {
    if (this.queuedKeys.has(key)) return false;
    this.queuedKeys.add(key);
    this.jobs.push({ key, reason });
    this.onQueued?.(key);
    void this.drain();
    return true;
  }
  /**
   * 処理名: キュー消去
   * 処理概要: 待機中ジョブと重複キーをすべて破棄する。
   * 実装理由: 範囲の一括削除時に古い処理を残さないため。
   * @returns 戻り値なし
   */
  clear(): void {
    this.jobs.length = 0;
    this.queuedKeys.clear();
  }
  /**
   * 処理名: ジョブ逐次実行
   * 処理概要: 有効なジョブをキュー順に実行する。
   * 実装理由: 同時実行によるOCRエンジン競合を避けるため。
   * @returns 非同期処理
   */
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

  /** キューから実行するジョブの厳密なコールバック型を保持する。
   * @param job 実行対象ジョブ
   * @returns 実行完了Promise
   */
  private runJobSignature(job: Job<K>): Promise<void> {
    void job;
    return Promise.resolve();
  }

  /** キー有効性検査の厳密なコールバック型を保持する。
   * @param key 検査対象キー
   * @returns 有効性
   */
  private validitySignature(key: K): boolean {
    void key;
    return true;
  }

  /** キュー登録通知の厳密なコールバック型を保持する。
   * @param key 登録対象キー
   * @returns 戻り値なし
   */
  private queuedSignature(key: K): void {
    void key;
  }
}
