+++
title = "Stop Prompt Engineering. Start Requirement Engineering."
date = "2026-06-03T07:00:00+00:00"
draft = false
description = "Argues that clear requirements matter more than prompt tricks when working with AI."
tags = ["ai", "requirements", "engineering"]
categories = ["software-engineering", "ai"]
slug = "stop-prompt-engineering-start-requirement-engineering"
+++

For the past two years, the tech world has insisted that mastering prompt engineering is the path to better AI outcomes. Entire courses, newsletters, and YouTube channels promise a magic phrase that will unlock more useful answers from models. After thousands of interactions with Claude, ChatGPT, and other systems, I have a different take: most prompt problems are actually requirement problems.

This distinction matters. Prompt engineering is primarily about how you ask; requirement engineering is about what you actually want. In my experience, being precise about the latter is far more valuable than polishing the former.

## The Myth of the Perfect Prompt

Many developers treat AI like a smarter search engine: when the output is poor they assume the problem is word choice. They add instructions like `"Act as a senior engineer," "Think step by step," "Use first principles," or even "Take a deep breath."` Sometimes those help, but most often they're papering over unclear requirements.

Consider how you would brief a human engineering team: `"Build me a dashboard"` is not enough information. `What dashboard? For whom? Which metrics? How often will it be used, and what decisions does it need to support?` 

No competent engineer would start building from that level of ambiguity, yet we give AI the same vague prompts all the time.

## A Familiar Engineering Problem

Here is a concrete example. 
> Prompt A: "Write a design document for a Kubernetes scheduling system." 

Expect a generic output. 

> Prompt B: "Write a design document for a Kubernetes scheduling system that allocates scarce GPU resources across multiple tenants."  
> 
> Then add: Audience: platform engineering team. 
> 
> Constraints: 
>   - existing clusters cannot be replaced
>   - fairness is more important than utilization
>   - must support quota enforcement
>   - failure domain should remain namespace-scoped. 

Include a problem statement, architecture, trade-offs, operational concerns, and open questions.

No model got smarter between A and B, the request did. Clear requirements produce focused, useful outputs.

## AI Rewards Clear Thinking

Modern AI systems surface ambiguity quickly. A vague requirement from a junior engineer might cause failures months into a project; a vague prompt reveals its shortcomings in seconds. That compressed feedback loop is why experienced engineers often achieve better AI results, not because of secret prompting techniques, but because they know how to define problems clearly.

## What Good Requirements Look Like

The most effective AI requests typically include five elements.

1) **`Objective:`** What are we trying to achieve? "Explain Kubernetes" is too vague; "Explain Kubernetes networking to a backend engineer preparing for a production migration" is much better.

2) **`Audience:`** Who will consume this output? The same explanation should look very different when written for a student, a CTO, or a platform engineer.

3) **`Constraints:`** Constraints often shape the solution more than the goal itself: use Go only; avoid external dependencies; must run on Kubernetes; keep the response under 500 words; assume readers understand Linux.

4) **`Success criteria:`** How will we judge the output? Examples include: include code examples, compare alternatives, highlight operational risks, or provide migration steps.

5) **`Context:`** Adding relevant context usually yields the biggest quality improvements. Most AI failures are not the result of model limitations but of missing information.

## The Parallel With Software Development

Using AI feels increasingly like software engineering:

Software development relies on requirements, architecture, acceptance criteria, constraints, and testing and so do effective AI interactions, which map respectively to context, prompt structure, output format, guardrails, and iteration. Just as architecture cannot rescue poor requirements, clever prompting cannot compensate for an undefined problem.

## Why This Matters for Engineers

AI is changing many workflows, but it does not remove the need for precise communication, if anything, it raises the bar. Engineers who get the most out of AI are those who can define problems clearly, express constraints precisely, identify trade-offs, and recognize missing information. Those are requirement engineering skills, not merely prompting tricks.

## The Future Skill Isn't Prompting

Prompt engineering has value, and understanding model behavior helps. Still, the title "prompt engineer" may one day sound as quaint as "Google search engineer." The enduring skill is older: transforming a vague idea into a precise specification. That skill made engineers effective before AI, and it makes them even more effective now.

The next time an AI response disappoints you, don't immediately ask "How can I improve this prompt?" Instead ask, "Have I actually defined the problem?" More often than not, that's where the real issue lies.


