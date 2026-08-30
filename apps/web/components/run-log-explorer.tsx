'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest, type RequestAttempt } from '../lib/api';

interface RunLogExplorerProps {
  readonly runId: string;
  readonly onClose: () => void;
}

export function RunLogExplorer({
  runId,
  onClose,
}: RunLogExplorerProps): React.ReactElement {
  const [items, setItems] = useState<readonly RequestAttempt[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusCode, setStatusCode] = useState('');
  const [keyword, setKeyword] = useState('');
  const [minLatencyMs, setMinLatencyMs] = useState('');
  const [body, setBody] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const query = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (statusCode !== '') query.set('statusCode', statusCode);
    if (keyword !== '') query.set('keyword', keyword);
    if (minLatencyMs !== '') query.set('minLatencyMs', minLatencyMs);
    const result = await apiRequest<{
      items: RequestAttempt[];
      total: number;
    }>(`/runs/${runId}/logs?${query.toString()}`);
    setItems(result.items);
    setTotal(result.total);
  }, [keyword, minLatencyMs, page, runId, statusCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const showBody = async (
    attemptId: string,
    kind: 'request' | 'response'
  ): Promise<void> => {
    const result = await apiRequest<{ content: string | null }>(
      `/runs/${runId}/logs/${attemptId}/${kind}/body`
    );
    setBody(result.content);
  };

  return (
    <div className="log-explorer">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Request attempts</span>
          <h3>{total.toLocaleString()} persisted logs</h3>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="log-filters">
        <input
          placeholder="Status code"
          value={statusCode}
          onChange={(event) => {
            setPage(1);
            setStatusCode(event.target.value);
          }}
        />
        <input
          placeholder="Minimum latency (ms)"
          value={minLatencyMs}
          onChange={(event) => {
            setPage(1);
            setMinLatencyMs(event.target.value);
          }}
        />
        <input
          placeholder="Payload/response keyword"
          value={keyword}
          onChange={(event) => {
            setPage(1);
            setKeyword(event.target.value);
          }}
        />
      </div>
      <div className="log-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sequence</th>
              <th>Try</th>
              <th>Status</th>
              <th>Request</th>
              <th>Latency</th>
              <th>Error</th>
              <th>Bodies</th>
            </tr>
          </thead>
          <tbody>
            {items.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.logicalRequestSequence}</td>
                <td>{attempt.attemptNumber}</td>
                <td>{attempt.statusCode ?? '—'}</td>
                <td>
                  {attempt.requestMethod} {attempt.requestUrl}
                </td>
                <td>{attempt.latencyMs} ms</td>
                <td>{attempt.errorType ?? attempt.error ?? '—'}</td>
                <td>
                  <button
                    disabled={attempt.requestBodyRef === null}
                    onClick={() => void showBody(attempt.id, 'request')}
                  >
                    Request
                  </button>{' '}
                  <button
                    disabled={attempt.responseBodyRef === null}
                    onClick={() => void showBody(attempt.id, 'response')}
                  >
                    Response
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row-actions">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
      {body !== null && (
        <pre className="payload-preview">
          <button onClick={() => setBody(null)}>Close body</button>
          {'\n'}
          {body}
        </pre>
      )}
    </div>
  );
}
