# QA / Load Testing Tool

The tool defines and executes controlled REST/HTTP API load tests against projects owned by its operator.

## Testing Model

**Endpoint**:
A saved REST/HTTP request configuration belonging to a Project and executable by a Test Run.
_Avoid_: Test case, request configuration

**Test Run**:
One recorded execution of an Endpoint using a fixed rate, concurrency, retry, and payload configuration.
_Avoid_: Test, job

**Logical Request**:
One scheduled unit of workload in a Test Run. A logical request can result in more than one Request Attempt when retries occur.
_Avoid_: Request attempt

**Request Attempt**:
One actual HTTP dispatch made for a Logical Request, including a retry.
_Avoid_: Request
