import { useHealthCheck } from "../hooks/useHealthCheck";

export function HealthCheckReporter() {
  useHealthCheck();
  return null;
}
