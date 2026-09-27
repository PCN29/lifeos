# Maths Methods U3&4 — micro-concepts (DRAFT, for review)

Status: **shipped.** The live list is `lib/syllabus.js`, alongside Physics, English, Software Development and
Indonesian; this file is the design record for the Methods part.

The **(verify)** items were checked against the 2023–2027 study design (September 2026):
- Newton's method: **in** (Outcome 1 key skills name "the algorithm for Newton's method") → `mm.alg.newton`
- general solutions of equations: **in** ("general and specific solutions") → folded into `mm.alg.circ_eq`
- matrix form of transformations: **not in** (the design only names "representations of points and
  transformations of the plane") → dropped; mapping notation lives in `mm.tr.find`
- also added from the design: `mm.st.param`, `mm.st.simulate`, `mm.x.pseudocode`; composite and inverse
  functions moved to AOS 2 where the design puts them (`mm.alg.composite`, `mm.alg.inverse`)

**How to review:**
- **IDs** (`mm.calc.chain`) are permanent once shipped, because evidence records point at them. Rename the display name freely, but treat the ID as fixed.
- **Topic** is the ID of the existing entry in `state.topics`, so each concept rolls up into the topic confidence you already have.
- **Exam** is where the concept is usually tested: 1 = tech-free, 2 = tech-active, 1/2 = both.

## Default mastery rule (stage 2 implements this; per-concept lines below say *what* counts as correct)

A concept is **Mastered** when all of these hold:
1. at least 3 correct attempts on different questions, from at least 2 different sources (VCAA, Heffernan, etc.);
2. the most recent attempt is correct;
3. the last correct attempt is within 28 days;
4. for concepts tagged Exam 1 or 1/2, at least one of those correct attempts was done without CAS.

Anything short of that is graded from the evidence into Untouched, Shaky, Okay or Solid, weighted by how the work was marked: teacher-marked counts more than self-marked. The exact weighting is stage 2.

---

## Area 1 — Functions, relations and graphs

### Functions, relations & graphs — topic `mm-functions,_relations_&_graphs`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.fn.domain` | Domain, range & function notation | 1/2 | state the maximal domain and range of any rule, including restricted domains, in correct interval notation |
| `mm.fn.poly_graph` | Polynomial graphs | 1/2 | sketch a factorised polynomial with correct intercepts, turning points and root behaviour (cross, touch, inflect) |
| `mm.fn.power` | Power functions x^n, n ∈ Q | 1/2 | sketch hyperbola, truncus, square-root and cube-root forms with asymptotes and endpoints labelled |
| `mm.fn.exp_log_graph` | Exponential & log graphs | 1/2 | sketch transformed eˣ and logₑx with the asymptote, intercepts and domain correct |
| `mm.fn.circ_graph` | Circular function graphs | 1/2 | sketch a sin(n(x−b))+c over a given interval with amplitude, period and endpoints right; tan with its asymptotes |
| `mm.fn.hybrid` | Hybrid (piecewise) functions | 1/2 | sketch a hybrid function, find parameters that make it continuous (or smooth) at the joins |
| `mm.fn.composite` | Composite functions | 1/2 | test whether f∘g exists (ran g ⊆ dom f), then give its rule and domain |
| `mm.fn.inverse` | Inverse functions | 1/2 | restrict a domain to make f one-to-one, find f⁻¹ with its domain, and find where f meets f⁻¹ |
| `mm.fn.sum_product` | Sums & products of functions | 2 | sketch f+g and f·g from the graphs of f and g, including the domain of the result |
| `mm.fn.modelling` | Modelling with functions | 2 | find unknown parameters from given conditions and interpret the result in context |

### Transformations — topic `mm-transformations`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.tr.apply` | Applying transformations | 1/2 | write the image of y=f(x) under a stated sequence of dilations, reflections and translations |
| `mm.tr.find` | Finding the transformation | 1/2 | give a sequence (or mapping (x,y)→(x′,y′)) that takes one rule to another, and invert it |
| `mm.tr.matrix` | Matrix form of transformations **(verify)** | 2 | express and apply a transformation as a matrix equation, if it's still in the 2023 design |
| `mm.tr.families` | Families of functions & parameters | 2 | find the values of a parameter k giving 0, 1 or 2 solutions or intersections |

## Area 2 — Algebra, number and structure — topic `mm-algebra,_number_&_structure`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.alg.poly_solve` | Solving polynomials | 1 | use the factor theorem and division to fully factorise a cubic or quartic and solve it by hand |
| `mm.alg.laws` | Index & log laws | 1 | simplify and combine index and log expressions, including change of base, without CAS |
| `mm.alg.exp_log_eq` | Exponential & log equations | 1 | solve equations like e^{2x} − 3eˣ + 2 = 0 or log(x) + log(x−3) = 1, rejecting invalid roots |
| `mm.alg.circ_eq` | Circular-function equations | 1/2 | solve a sin(nx) = k over a stated interval and find every solution; general solutions **(verify)** |
| `mm.alg.literal` | Literal equations & parameters | 1/2 | rearrange and solve equations containing parameters, stating conditions on them |
| `mm.alg.sim_eq` | Simultaneous linear equations | 2 | find the values of k giving a unique solution, infinitely many, or none |
| `mm.alg.func_eq` | Functional equations | 1/2 | check which functions satisfy a property like f(x+y) = f(x)f(y) and justify it |
| `mm.alg.numerical` | Numerical root-finding (Newton's method) **(verify)** | 2 | run Newton's method from a given x₀, follow or write pseudocode, and explain when it fails |

## Area 3 — Calculus

### Differentiation — topic `mm-calculus_—_differentiation`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.diff.limits` | Limits, continuity, differentiability | 1/2 | identify where a function isn't continuous or differentiable, and differentiate from first principles |
| `mm.diff.standard` | Standard derivatives | 1 | differentiate xⁿ, eˣ, logₑx, sin, cos and tan (with linear inner functions) instantly |
| `mm.diff.chain` | Chain rule | 1 | differentiate composites by hand, e.g. e^{sin 2x} or logₑ(x²+1) |
| `mm.diff.product` | Product rule | 1 | differentiate products by hand and simplify to a factorised form |
| `mm.diff.quotient` | Quotient rule | 1 | differentiate quotients by hand and simplify the numerator |
| `mm.diff.tangent` | Tangents & normals | 1/2 | find tangent and normal equations at a point, or from a given gradient or a point off the curve |
| `mm.diff.stationary` | Stationary points & monotonicity | 1/2 | find stationary points, classify them, and state strictly increasing/decreasing intervals with correct endpoints |
| `mm.diff.graph_deriv` | Graphs of derivative functions | 1/2 | sketch f′ from the graph of f, and the reverse |
| `mm.diff.optimise` | Optimisation | 2 | set up the function to optimise, find its max or min, and check the endpoints |
| `mm.diff.rates` | Rates of change | 1/2 | find average and instantaneous rates of change and interpret them in context |

### Integration & applications — topic `mm-calculus_—_integration_&_applications`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.int.standard` | Standard antiderivatives | 1 | antidifferentiate xⁿ, (ax+b)ⁿ, e^{kx}, 1/(ax+b), sin(kx) and cos(kx) by hand |
| `mm.int.recognition` | Antidifferentiation by recognition | 1 | use a given derivative to find an antiderivative ("hence find…") |
| `mm.int.definite` | Definite integrals & properties | 1/2 | evaluate definite integrals and use linearity, reversed bounds and interval splitting |
| `mm.int.area_axis` | Area under a curve | 1/2 | find the area between a curve and the x-axis, splitting at roots so signed areas don't cancel |
| `mm.int.area_between` | Area between curves | 2 | find the area between two curves, including finding the intersection bounds |
| `mm.int.average` | Average value | 1/2 | compute the average value of a function over an interval and interpret it |
| `mm.int.numerical` | Numerical integration | 1/2 | apply trapezium or left/right rectangle approximations and say whether they over- or under-estimate |
| `mm.int.accumulate` | Accumulated change | 2 | recover f from f′ plus a condition, and interpret an integral as a total change in context |

## Area 4 — Data analysis, probability and statistics

### Discrete random variables — topic `mm-discrete_random_variables`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.dp.conditional` | Conditional probability & independence | 1/2 | use tree diagrams or Karnaugh maps for P(A\|B), and test for independence |
| `mm.dp.pmf` | Discrete distributions | 1/2 | check a pmf is valid and find unknown probabilities in it |
| `mm.dp.expect` | Expectation & variance (discrete) | 1/2 | compute E(X), Var(X) and sd(X), including for aX+b |
| `mm.dp.binomial` | Binomial distribution | 1/2 | recognise a binomial setting, compute P(X=x) and P(X≥x), and give the mean and variance |
| `mm.dp.binomial_n` | Binomial: finding n or p | 2 | find the minimum n such that P(X ≥ 1) > a given probability, or solve for p |

### Continuous random variables — topic `mm-continuous_random_variables`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.cp.pdf` | Probability density functions | 1/2 | check a pdf is valid (non-negative, integrates to 1) and find unknown constants |
| `mm.cp.prob` | Probabilities from a pdf | 1/2 | compute interval and conditional probabilities from a pdf |
| `mm.cp.summary` | Mean, variance, median, percentiles | 2 | find E(X), Var(X), the median and percentiles from a pdf |
| `mm.cp.normal` | Normal distribution | 1/2 | standardise, use the 68–95–99.7 rule, and compute normal probabilities |
| `mm.cp.inv_normal` | Inverse normal | 2 | find x, μ or σ from a given probability, including simultaneous unknowns |
| `mm.cp.normal_cond` | Normal: conditional probability | 2 | compute P(X > a \| X > b) and similar for normal X |

### Sampling & confidence intervals — topic `mm-sampling_&_confidence_intervals`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.st.phat` | Sample proportion p̂ | 1/2 | give the distribution, mean and sd of p̂; use the exact binomial for small n |
| `mm.st.phat_normal` | Normal approximation to p̂ | 2 | approximate P(p̂ > k) using the normal distribution, and know when that's reasonable |
| `mm.st.ci` | Confidence interval for p | 2 | construct an approximate 95% (or other level) confidence interval from sample data |
| `mm.st.margin` | Margin of error & sample size | 2 | find the margin of error, and the sample size needed for a given margin |
| `mm.st.interpret` | Interpreting intervals | 1/2 | explain what the confidence level means, and whether a claimed p is plausible |

## Cross-cutting — topic `mm-exam_1_skills_—_by_hand`

| ID | Concept | Exam | Mastered when you can… |
|---|---|---|---|
| `mm.x.exact_values` | Exact values & unit circle | 1 | give exact circular values in all quadrants, including symmetry identities, instantly |
| `mm.x.algebra` | By-hand algebra fluency | 1 | expand, factorise and simplify fractions and surds with no slips across a full Exam 1 |
| `mm.x.show_that` | "Show that" & "hence" | 1 | write complete, justified working that would earn every mark on show-that questions |
| `mm.x.cas` | CAS fluency | 2 | define functions, solve with domain restrictions, and switch exact/decimal without errors |

---

**Totals:** 60 concepts across 9 topics. For sign-off, tell me which to add, cut, merge, or split, and resolve the **(verify)** items.
