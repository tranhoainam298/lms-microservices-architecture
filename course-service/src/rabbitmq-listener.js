// Compatibility export for older startup code. Course access is activated only
// through the authenticated internal HTTP endpoint; events are notifications
// and must never perform a second enrollment write.
export async function startRabbitMQListener() {
  return { started: false, reason: 'synchronous-access-activation-is-authoritative' };
}
