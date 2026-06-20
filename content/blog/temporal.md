---
title: "Self-Hosting Temporal in Go to Replace Cron and Custom State Management"
date: 2026-06-20T17:30:00+05:30
draft: false
description: "Why cron jobs inevitably grow into fragile state machines, and how self-hosting Temporal provides a cleaner, durable execution model for Go backends."
tags: ["go", "golang", "temporal", "backend", "distributed-systems", "architecture"]
categories: ["Engineering", "Go", "Backend"]
slug: "self-hosting-temporal-in-go"
---

Most backend systems eventually grow a hidden workflow engine. It rarely starts that way. It usually begins with a simple cron job that wakes up every ten minutes, queries the database for pending records, processes them, and updates a status column. It seems simple enough, until production happens. 

A downstream API times out. A worker crashes halfway through processing. A deployment abruptly kills the process. A customer asks why their job is stuck. In response, someone adds a retry counter. Someone else adds a `locked_until` field. Then an admin retry button appears, followed by a cleanup script and eventually a dedicated dashboard. At that point, cron isn't just scheduling work anymore. It's coordinating business state. That's exactly where Temporal starts to make sense.

## Cron Is Good at Time, Bad at State

Cron answers one question exceptionally well: when should this process start? But most real backend workflows need to answer much harder questions. What already happened? What should happen next? Is this safe to retry? Did we already charge the customer? Can this workflow wait for human approval? What happens if the process dies right now? Cron doesn't have answers for those questions, so we usually end up creating our own answers using database state.

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    status TEXT NOT NULL,
    retry_count INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

Then the worker does something like this:

```go
func ProcessPendingJobs(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `
		SELECT id
		FROM jobs
		WHERE status = 'pending'
		   OR (status = 'failed' AND retry_count < 5)
		LIMIT 100
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var jobID string
		if err := rows.Scan(&jobID); err != nil {
			return err
		}

		if err := processJob(ctx, jobID); err != nil {
			_, _ = db.ExecContext(ctx, `
				UPDATE jobs
				SET status = 'failed',
				    retry_count = retry_count + 1,
				    last_error = $2,
				    updated_at = now()
				WHERE id = $1
			`, jobID, err.Error())
			continue
		}

		_, _ = db.ExecContext(ctx, `
			UPDATE jobs
			SET status = 'completed',
			    updated_at = now()
			WHERE id = $1
		`, jobID)
	}

	return rows.Err()
}
```

This looks reasonable at first glance, but it's already a workflow engine. It's just a fragile one.

## The Problem With Homemade State Machines

Once business logic becomes multi-step, state management gets messy quickly. Imagine a standard order workflow: reserve inventory, charge payment, generate invoice, send a confirmation email, and notify the warehouse. With cron and database state, you usually end up defining explicit statuses for every step, like `inventory_reserved` or `payment_charged`. 

Now every single step needs to be resumable. Every step needs retries, idempotency, and visibility. Every new requirement adds another complex branch to your state machine. The database is no longer just storing application data; it's storing execution state. Temporal gives you a much cleaner model: store your business data in your database, and store your workflow execution state in Temporal.

## The Temporal Mental Model

Temporal relies on three core concepts. A **Workflow** contains your deterministic orchestration logic. An **Activity** handles real-world side effects like database writes, API calls, emails, payments, and file processing. A **Worker** is your Go process that actually executes those workflows and activities.

The most important separation is this: workflows decide what should happen, and activities do the actual work. That boundary matters because Temporal records the workflow history and replays it to recover state after crashes. This is the foundation of durable execution. Temporal records events in persistent storage, like when an activity is scheduled, completed, a timer fires, or a signal is received. On replay, completed activity results are simply read from history instead of being executed all over again.

## A Simple Temporal Workflow in Go

Here is how that same order process looks as a Temporal workflow:

```go
package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

type OrderInput struct {
	OrderID string
	UserID  string
}

func OrderWorkflow(ctx workflow.Context, input OrderInput) error {
	activityOptions := workflow.ActivityOptions{
		StartToCloseTimeout: time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second * 2,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    5,
		},
	}

	ctx = workflow.WithActivityOptions(ctx, activityOptions)

	if err := workflow.ExecuteActivity(ctx, ReserveInventory, input.OrderID).Get(ctx, nil); err != nil {
		return err
	}

	if err := workflow.ExecuteActivity(ctx, ChargePayment, input.OrderID).Get(ctx, nil); err != nil {
		return err
	}

	if err := workflow.ExecuteActivity(ctx, GenerateInvoice, input.OrderID).Get(ctx, nil); err != nil {
		return err
	}

	if err := workflow.ExecuteActivity(ctx, SendConfirmationEmail, input.UserID).Get(ctx, nil); err != nil {
		return err
	}

	return workflow.ExecuteActivity(ctx, NotifyWarehouse, input.OrderID).Get(ctx, nil)
}
```

This reads like perfectly normal Go code, but the execution model is profoundly different. If the worker crashes after `ChargePayment` succeeds, Temporal doesn't restart the workflow from the beginning and double-charge the customer. Instead, it replays the workflow history, sees that `ChargePayment` already completed, returns the recorded result, and seamlessly continues from the next step. That is the crucial safety net cron simply doesn't give you.

## Activities Are Where Side Effects Belong

Activities are just normal Go functions. They can talk to databases, call APIs, publish messages, send emails, and do anything non-deterministic.

```go
package activities

import (
	"context"
	"fmt"
)

type Activities struct {
	Payments  PaymentClient
	Inventory InventoryClient
	Email     EmailClient
}

func (a *Activities) ReserveInventory(ctx context.Context, orderID string) error {
	return a.Inventory.Reserve(ctx, orderID)
}

func (a *Activities) ChargePayment(ctx context.Context, orderID string) error {
	paymentID, err := a.Payments.Charge(ctx, orderID)
	if err != nil {
		return err
	}

	fmt.Println("payment charged:", paymentID)
	return nil
}

func (a *Activities) SendConfirmationEmail(ctx context.Context, userID string) error {
	return a.Email.Send(ctx, userID, "Your order is confirmed")
}
```

The rule of thumb is simple: if it touches the outside world, make it an activity. Don't call your database directly from workflow code. Don't call external APIs from workflow code. Don't use `time.Now()` or generate random values directly inside workflow code. Workflow code must be strictly deterministic because Temporal may replay it many times.

## Running the Worker

A Temporal worker is just a standard Go process that polls a Temporal task queue.

```go
package main

import (
	"log"

	"example.com/app/activities"
	"example.com/app/workflows"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

const TaskQueue = "orders"

func main() {
	c, err := client.Dial(client.Options{
		HostPort: "localhost:7233",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	w := worker.New(c, TaskQueue, worker.Options{})

	w.RegisterWorkflow(workflows.OrderWorkflow)

	a := &activities.Activities{
		Payments:  NewPaymentClient(),
		Inventory: NewInventoryClient(),
		Email:     NewEmailClient(),
	}

	w.RegisterActivity(a.ReserveInventory)
	w.RegisterActivity(a.ChargePayment)
	w.RegisterActivity(a.SendConfirmationEmail)

	if err := w.Run(worker.InterruptCh()); err != nil {
		log.Fatal(err)
	}
}
```

Temporal owns the durable state, while your worker owns the code. That separation is incredibly powerful. Your workers can crash, restart, scale horizontally, or deploy entirely new versions, and the workflow state remains perfectly safe because it doesn't live inside them.

## Starting a Workflow Instead of Scheduling a Cron Job

Instead of relying on cron to call a binary at a specific interval, your application explicitly starts a workflow.

```go
package main

import (
	"context"
	"log"

	"example.com/app/workflows"

	"go.temporal.io/sdk/client"
)

func main() {
	c, err := client.Dial(client.Options{
		HostPort: "localhost:7233",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer c.Close()

	opts := client.StartWorkflowOptions{
		ID:        "order-123",
		TaskQueue: "orders",
	}

	run, err := c.ExecuteWorkflow(
		context.Background(),
		opts,
		workflows.OrderWorkflow,
		workflows.OrderInput{
			OrderID: "order-123",
			UserID:  "user-456",
		},
	)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("workflow started", run.GetID(), run.GetRunID())
}
```

The workflow ID is highly important. You should use a stable business identifier whenever possible. For an order workflow, use `order-{id}`. For a user onboarding workflow, use `user-onboarding-{userID}`. This naturally gives you a robust idempotency boundary, preventing the same business process from running concurrently.

## Replacing Polling With Signals

A lot of cron systems exist purely because an application needs to keep polling for state changes. You might have code that loops every minute to check an approval status in the database before continuing.

Temporal eliminates this by giving you signals. A signal is simply an external message sent directly to a running workflow.

```go
type ApprovalSignal struct {
	Approved bool
	Reason   string
}

func ApprovalWorkflow(ctx workflow.Context, orderID string) error {
	var signal ApprovalSignal
	signalChan := workflow.GetSignalChannel(ctx, "approval")

	signalChan.Receive(ctx, &signal)

	if !signal.Approved {
		return temporal.NewApplicationError(
			"approval rejected",
			"ApprovalRejected",
			signal.Reason,
		)
	}

	return workflow.ExecuteActivity(ctx, ChargePayment, orderID).Get(ctx, nil)
}
```

External code can then approve the workflow dynamically:

```go
err := c.SignalWorkflow(
	context.Background(),
	"order-123",
	"",
	"approval",
	ApprovalSignal{
		Approved: true,
		Reason:   "manual approval completed",
	},
)
```

There is no polling table, no cron loop, and no heavy database queries running every minute. The workflow simply waits durably until it receives the signal.

## Replacing Sleep and Reminder Tables With Timers

Another common anti-pattern is building a database table specifically for scheduled reminders, which cron then polls to find tasks where `run_at <= now()`. Temporal workflows can handle this naturally by sleeping durably.

```go
func TrialReminderWorkflow(ctx workflow.Context, userID string) error {
	if err := workflow.ExecuteActivity(ctx, SendWelcomeEmail, userID).Get(ctx, nil); err != nil {
		return err
	}

	if err := workflow.Sleep(ctx, 7*24*time.Hour); err != nil {
		return err
	}

	return workflow.ExecuteActivity(ctx, SendTrialEndingEmail, userID).Get(ctx, nil)
}
```

This isn't a goroutine holding up process memory and sleeping for seven days. Temporal records a timer in the workflow history and seamlessly wakes the workflow later. These timers are fully persisted and easily survive server or worker restarts.

## Self-Hosting Temporal

For local development, Docker Compose is completely fine. For production, a basic self-hosted setup usually involves the Temporal core services (frontend, history, matching), your persistence layer (like PostgreSQL), the Temporal Web UI, and your application workers.

For smaller teams, PostgreSQL is generally the simplest starting point. The mental model is straightforward: your application talks to the Temporal Server, which uses PostgreSQL for execution history. Your workers connect to the Temporal Server to execute the code, while your application database continues to store your standard business data. Keeping execution state and business data separated makes the entire system easier to reason about.

## Where Temporal Is Worth It

Temporal isn't a better cron for every single use case. Don't use it for simple maintenance scripts like cleaning up a `/tmp/` directory. That's exactly what cron was built to do.

Temporal is worth considering when your job has multiple steps, requires retries, involves long waits, needs human approval, or interacts heavily with external APIs. If you're handling money movement, provisioning infrastructure, managing complex cancellations, or need strict progress tracking and manual recovery, Temporal shines. In other words, use Temporal when the cron job has officially evolved into a critical business process.

## Where It Can Hurt

Temporal definitely has sharp edges, and the biggest one is determinism. You can't use `time.Now()` inside a workflow because it evaluates differently on replay. You must use Temporal's workflow clock instead via `workflow.Now(ctx)`. 

The second sharp edge is workflow versioning. If your workflows run for days or weeks, you can't casually reorder workflow steps while old executions are still active, because replays must remain compatible with previous history. You have to treat workflow changes with the same care and deliberation as database migrations.

## The Real Win

The biggest win isn't just that Temporal replaces cron. It's that Temporal replaces the massive pile of accidental infrastructure that inevitably grows around cron. It eliminates custom retry loops, state tables, lock rows, polling workers, manual repair scripts, and stuck-job dashboards.

You still need solid engineering discipline. Activities must be idempotent, workflows must be deterministic, workers must be monitored, and your persistence layer must be backed up. But the core execution model becomes explicit and intentional, rather than being scattered across application code, SQL queries, and operational folklore.

## Closing Thought

Cron is an excellent tool for starting simple work at a known time. But once a scheduled job starts carrying complex business state, cron is no longer the right abstraction. At that point, you aren't just scheduling a command. You're running a workflow. And if you're already building workflows with custom status columns, retries, locks, and recovery scripts, self-hosting Temporal is likely much simpler than maintaining your own workflow engine by accident.
