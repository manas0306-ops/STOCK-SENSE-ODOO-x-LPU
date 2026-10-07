const test = require('node:test');
const assert = require('node:assert');
const OperationStateMachine = require('../src/domain/stateMachine');
const { AppError } = require('../src/utils/errors');

test('Phase 3 - Operation State Machine Integrity Suite', async (t) => {
  await t.test('1. Valid forward transitions succeed', () => {
    // draft -> ready
    assert.strictEqual(OperationStateMachine.canTransition('draft', 'ready'), true);
    assert.doesNotThrow(() => OperationStateMachine.assertTransition('draft', 'ready', 'Receipt'));

    // draft -> canceled
    assert.strictEqual(OperationStateMachine.canTransition('draft', 'canceled'), true);
    assert.doesNotThrow(() => OperationStateMachine.assertTransition('draft', 'canceled', 'Receipt'));

    // ready -> done
    assert.strictEqual(OperationStateMachine.canTransition('ready', 'done'), true);
    assert.doesNotThrow(() => OperationStateMachine.assertTransition('ready', 'done', 'Receipt'));

    // ready -> canceled
    assert.strictEqual(OperationStateMachine.canTransition('ready', 'canceled'), true);
    assert.doesNotThrow(() => OperationStateMachine.assertTransition('ready', 'canceled', 'Receipt'));

    // Idempotent self-transition
    assert.strictEqual(OperationStateMachine.canTransition('ready', 'ready'), true);
  });

  await t.test('2. Forbidden transitions are strictly rejected', () => {
    // canceled -> ready (FORBIDDEN)
    assert.strictEqual(OperationStateMachine.canTransition('canceled', 'ready'), false);
    assert.throws(
      () => OperationStateMachine.assertTransition('canceled', 'ready', 'Receipt'),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'INVALID_STATE_TRANSITION');
        return true;
      }
    );

    // done -> ready (FORBIDDEN)
    assert.strictEqual(OperationStateMachine.canTransition('done', 'ready'), false);
    assert.throws(
      () => OperationStateMachine.assertTransition('done', 'ready', 'Delivery'),
      (err) => err.code === 'INVALID_STATE_TRANSITION'
    );

    // done -> draft (FORBIDDEN)
    assert.strictEqual(OperationStateMachine.canTransition('done', 'draft'), false);
    assert.throws(
      () => OperationStateMachine.assertTransition('done', 'draft', 'Transfer'),
      (err) => err.code === 'INVALID_STATE_TRANSITION'
    );

    // canceled -> done (FORBIDDEN)
    assert.strictEqual(OperationStateMachine.canTransition('canceled', 'done'), false);
    assert.throws(
      () => OperationStateMachine.assertTransition('canceled', 'done', 'Adjustment'),
      (err) => err.code === 'INVALID_STATE_TRANSITION'
    );

    // done -> canceled (FORBIDDEN - terminal)
    assert.strictEqual(OperationStateMachine.canTransition('done', 'canceled'), false);
  });
});
