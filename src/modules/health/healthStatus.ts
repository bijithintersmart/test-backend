type ServiceStatus = {
  status: 'UP' | 'DOWN';
  lastChange: number; // timestamp in ms of last status change
  error?: string; // error message when DOWN
};

export const healthStatus: Record<'server' | 'database' | 'redis', ServiceStatus> = {
  server: { status: 'UP', lastChange: Date.now() },
  database: { status: 'UP', lastChange: Date.now() },
  redis: { status: 'UP', lastChange: Date.now() },
};
export default healthStatus;
