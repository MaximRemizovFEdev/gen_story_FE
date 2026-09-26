# Paid Generation Draft Flow

Backend contract source: `../gen_story_BE/docs/swagger.yaml`, checked on 2026-09-26.

## Endpoints

- `POST /api/generation-drafts`
  - JSON questionnaire, or multipart `formData` plus `childPhoto`.
  - Returns `201 { draftId, expiresAt }`.
  - The backend derives ownership from the authenticated session.
- `POST /api/payments/generation/create`
  - JSON body: `{ "draftId": "..." }`.
  - Returns `201 { purchaseId, providerPaymentId, confirmationUrl }`.
  - The frontend opens `confirmationUrl` in the current tab.
- `GET /api/generation-drafts/{draftId}/status`
  - Explicit, owner-scoped operation lookup.
  - A foreign or missing operation returns `404`; the frontend must not replace it with discovery.
- `GET /api/payments/generation/current`
  - Read-only discovery for reload/sign-in without browser-held state.
  - Returns `{ operation: null }` when no eligible operation exists.
  - Never creates drafts, payments, generation, or retries failures.
- `GET /api/generate-flow/{storyId}/status`
  - Existing stage polling after an operation exposes a nonterminal `storyId`.
- `GET /api/books`
  - Existing authenticated library refresh.

## Operation Statuses

`paymentStatus` values:
`not_created`, `pending`, `paid`, `reserved`, `consumed`, `canceled`, `failed`, `generation_failed`.

`generationStatus` values:
`not_started`, `queued`, `running`, `success`, `error`.

Frontend states:

- `checking_payment`: no payment yet or provider confirmation is pending.
- `payment_confirmed`: payment is paid but generation has not started.
- `generating`: generation is queued/running or a nonterminal `storyId` exists.
- `ready`: payment is consumed, generation is successful, and `storyId` is present.
- `error`: canceled/failed payment, generation failure, malformed status, or unavailable explicit operation.

## Recovery Rules

- Return URLs may contain `draftId`, `draft_id`, `operationId`, or `operation_id`; these are read identifiers only.
- Explicit return identifiers use `/generation-drafts/{draftId}/status` and preserve `404`.
- Plain returns, reloads, and later sign-ins use `/payments/generation/current`.
- Discovery selection is backend-defined: paid/reserved first, then active pending payments, then terminal operations; newest wins within a priority group.
- Consumed and generation-failed operations remain discoverable after draft/photo cleanup.
- Payment-create uncertainty is reconciled by read-only status calls. The frontend does not automatically repeat payment creation.
- `PAYMENT_RETURN_URL` is a backend deployment setting pointing at the frontend `/payment-return` route.
