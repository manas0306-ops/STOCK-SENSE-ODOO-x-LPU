const { AppError } = require('../utils/errors');

const OPERATION_STATUS = {
  DRAFT: 'draft',
  READY: 'ready',
  DONE: 'done',
  CANCELED: 'canceled',
};

// Allowed transitions
const ALLOWED_TRANSITIONS = {
  [OPERATION_STATUS.DRAFT]: [OPERATION_STATUS.READY, OPERATION_STATUS.CANCELED],
  [OPERATION_STATUS.READY]: [OPERATION_STATUS.DONE, OPERATION_STATUS.CANCELED],
  [OPERATION_STATUS.DONE]: [],       // Terminal state
  [OPERATION_STATUS.CANCELED]: [],   // Terminal state
};

class OperationStateMachine {
  static get statuses() {
    return OPERATION_STATUS;
  }

  /**
   * Check if transition is valid
   * @param {string} from Current status
   * @param {string} to Target status
   * @returns {boolean}
   */
  static canTransition(from, to) {
    if (!from || !to) return false;
    const fromNormalized = from.toLowerCase().trim();
    const toNormalized = to.toLowerCase().trim();

    if (fromNormalized === toNormalized) return true; // Idempotent no-op

    const allowed = ALLOWED_TRANSITIONS[fromNormalized];
    if (!allowed) return false;

    return allowed.includes(toNormalized);
  }

  /**
   * Enforce transition or throw AppError
   */
  static assertTransition(from, to, entityName = 'Operation') {
    const fromNormalized = (from || '').toLowerCase().trim();
    const toNormalized = (to || '').toLowerCase().trim();

    if (!ALLOWED_TRANSITIONS[fromNormalized]) {
      throw new AppError(
        `Unknown current status '${from}' for ${entityName}`,
        400,
        'INVALID_STATUS'
      );
    }

    if (!OperationStateMachine.canTransition(fromNormalized, toNormalized)) {
      throw new AppError(
        `Cannot change ${entityName} from '${fromNormalized}' to '${toNormalized}'. Allowed transitions: ${ALLOWED_TRANSITIONS[fromNormalized].join(', ') || 'none (terminal state)'}`,
        400,
        'INVALID_STATE_TRANSITION'
      );
    }
  }
}

module.exports = OperationStateMachine;
