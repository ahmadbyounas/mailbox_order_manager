import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OrderStatus } from "@prisma/client";
import { OrderStateMachine, ALLOWED_TRANSITIONS } from "../order-state-machine";
import { InvalidStateTransitionError } from "../types";

describe("OrderStateMachine - Pure State Transition Rules", () => {
  it("should allow transition from PENDING to PROVISIONING", () => {
    assert.equal(
      OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.PROVISIONING),
      true
    );
    assert.doesNotThrow(() => {
      OrderStateMachine.assertValidTransition(OrderStatus.PENDING, OrderStatus.PROVISIONING);
    });
  });

  it("should allow transition from PROVISIONING to ACTIVE", () => {
    assert.equal(
      OrderStateMachine.canTransition(OrderStatus.PROVISIONING, OrderStatus.ACTIVE),
      true
    );
    assert.doesNotThrow(() => {
      OrderStateMachine.assertValidTransition(OrderStatus.PROVISIONING, OrderStatus.ACTIVE);
    });
  });

  it("should allow transition from PROVISIONING to FAILED", () => {
    assert.equal(
      OrderStateMachine.canTransition(OrderStatus.PROVISIONING, OrderStatus.FAILED),
      true
    );
    assert.doesNotThrow(() => {
      OrderStateMachine.assertValidTransition(OrderStatus.PROVISIONING, OrderStatus.FAILED);
    });
  });

  it("should allow transition from FAILED to PENDING (Admin Retry)", () => {
    assert.equal(
      OrderStateMachine.canTransition(OrderStatus.FAILED, OrderStatus.PENDING),
      true
    );
    assert.doesNotThrow(() => {
      OrderStateMachine.assertValidTransition(OrderStatus.FAILED, OrderStatus.PENDING);
    });
  });

  it("should reject transition from ACTIVE to any other state (terminal state)", () => {
    assert.equal(OrderStateMachine.canTransition(OrderStatus.ACTIVE, OrderStatus.PENDING), false);
    assert.equal(OrderStateMachine.canTransition(OrderStatus.ACTIVE, OrderStatus.PROVISIONING), false);
    assert.equal(OrderStateMachine.canTransition(OrderStatus.ACTIVE, OrderStatus.FAILED), false);
    assert.equal(OrderStateMachine.canTransition(OrderStatus.ACTIVE, OrderStatus.ACTIVE), false);

    assert.throws(
      () => OrderStateMachine.assertValidTransition(OrderStatus.ACTIVE, OrderStatus.PENDING),
      InvalidStateTransitionError
    );
  });

  it("should reject direct jump from PENDING to ACTIVE or FAILED", () => {
    assert.equal(OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.ACTIVE), false);
    assert.equal(OrderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.FAILED), false);

    assert.throws(
      () => OrderStateMachine.assertValidTransition(OrderStatus.PENDING, OrderStatus.ACTIVE),
      (err: unknown) => {
        return err instanceof InvalidStateTransitionError && err.fromStatus === OrderStatus.PENDING && err.toStatus === OrderStatus.ACTIVE;
      }
    );
  });

  it("should correctly report allowed next states", () => {
    assert.deepEqual(OrderStateMachine.getAllowedNextStates(OrderStatus.PENDING), [OrderStatus.PROVISIONING]);
    assert.deepEqual(OrderStateMachine.getAllowedNextStates(OrderStatus.PROVISIONING), [OrderStatus.ACTIVE, OrderStatus.FAILED]);
    assert.deepEqual(OrderStateMachine.getAllowedNextStates(OrderStatus.ACTIVE), []);
    assert.deepEqual(OrderStateMachine.getAllowedNextStates(OrderStatus.FAILED), [OrderStatus.PENDING]);
  });
});
