function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`${name}_required`);
  return value;
}

function unwrap(result, operation) {
  if (result?.error) {
    const message = result.error.message ?? result.error.error ?? String(result.error);
    throw new Error(`${operation}_failed:${message}`);
  }
  return result?.data;
}

function one(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export class SupabaseQueueProvider {
  constructor({ client, queueCode, workerId }) {
    this.client = required(client, 'client');
    this.queueCode = required(queueCode, 'queue_code');
    this.workerId = required(workerId, 'worker_id');
  }

  async publish({
    jobType,
    jobVersion = 1,
    deduplicationKey,
    sourceEventId = null,
    organizationId = null,
    subjectType = null,
    subjectId = null,
    payload = {},
    delaySeconds = 0,
  }) {
    const data = unwrap(await this.client.rpc('queue_enqueue_job', {
      p_queue_code: this.queueCode,
      p_job_type: required(jobType, 'job_type'),
      p_job_version: jobVersion,
      p_deduplication_key: required(deduplicationKey, 'deduplication_key'),
      p_source_event_id: sourceEventId,
      p_organization_id: organizationId,
      p_subject_type: subjectType,
      p_subject_id: subjectId,
      p_payload: payload,
      p_delay_seconds: delaySeconds,
    }), 'queue_enqueue_job');
    return { jobId: one(data) };
  }

  async receive({ maxMessages = 1, visibilityTimeoutSeconds = 120 } = {}) {
    const data = unwrap(await this.client.rpc('queue_receive_jobs', {
      p_queue_code: this.queueCode,
      p_worker_id: this.workerId,
      p_batch_size: maxMessages,
      p_visibility_timeout_seconds: visibilityTimeoutSeconds,
    }), 'queue_receive_jobs') ?? [];
    return data.map((delivery) => ({
      receiptHandle: delivery.receipt_handle,
      jobId: delivery.job_id,
      jobType: delivery.job_type,
      jobVersion: delivery.job_version,
      receiveCount: delivery.receive_count,
      visibilityDeadline: delivery.visibility_deadline,
      enqueuedAt: delivery.enqueued_at,
      payload: delivery.payload,
      headers: delivery.message_headers,
    }));
  }

  async extendVisibility({ receiptHandle, visibilityTimeoutSeconds }) {
    const data = unwrap(await this.client.rpc('queue_extend_visibility', {
      p_receipt_handle: required(receiptHandle, 'receipt_handle'),
      p_worker_id: this.workerId,
      p_visibility_timeout_seconds: visibilityTimeoutSeconds,
    }), 'queue_extend_visibility');
    return { visibilityDeadline: one(data) };
  }

  async acknowledge({ receiptHandle, resultDetails = {} }) {
    const data = unwrap(await this.client.rpc('queue_ack_job', {
      p_receipt_handle: required(receiptHandle, 'receipt_handle'),
      p_worker_id: this.workerId,
      p_result_details: resultDetails,
    }), 'queue_ack_job');
    return Boolean(one(data));
  }

  async retry({ receiptHandle, errorCode, delaySeconds, errorDetails = {} }) {
    const data = unwrap(await this.client.rpc('queue_retry_job', {
      p_receipt_handle: required(receiptHandle, 'receipt_handle'),
      p_worker_id: this.workerId,
      p_error_code: required(errorCode, 'error_code'),
      p_delay_seconds: delaySeconds,
      p_error_details: errorDetails,
    }), 'queue_retry_job');
    return { status: one(data) };
  }

  async deadLetter({ receiptHandle, reasonCode, reasonDetails = {} }) {
    const data = unwrap(await this.client.rpc('queue_dead_letter_job', {
      p_receipt_handle: required(receiptHandle, 'receipt_handle'),
      p_worker_id: this.workerId,
      p_reason_code: required(reasonCode, 'reason_code'),
      p_reason_details: reasonDetails,
    }), 'queue_dead_letter_job');
    return { deadLetterId: one(data) };
  }

  async redrive({ deadLetterId, reason }) {
    const data = unwrap(await this.client.rpc('queue_redrive_dead_letter', {
      p_dead_letter_id: required(deadLetterId, 'dead_letter_id'),
      p_reason: required(reason, 'reason'),
    }), 'queue_redrive_dead_letter');
    return { jobId: one(data) };
  }

  async metrics() {
    const data = unwrap(await this.client.rpc('queue_get_metrics', {
      p_queue_code: this.queueCode,
    }), 'queue_get_metrics');
    return one(data);
  }
}
