export interface ProxyNode {
  host: string;
  port: number;
  wss: number;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}
