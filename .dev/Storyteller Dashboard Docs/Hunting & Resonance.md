Implement the following resonance model for Toronto Rising. These are the exact mechanics used by the current Resonance Lab. Keep full precision throughout the calculation; round only for display.

**Inputs**

Each hunt supplies:

- Location modifiers for each flavor, represented as signed integers: `−2`, `−1`, `0`, `+1`, `+2`, etc.
- An optional desired resonance flavor.
- Hunt-roll margin.
- Outcome: basic win, critical win, messy critical, or failure.

Repeated modifiers stack. Combine modifiers affecting the same flavor into a net signed modifier before calculating.

The common flavors are **Choleric, Phlegmatic, Sanguine, Melancholic**. The rare flavors are **Primal, Ischemic, Mercurial**.

**1. Calculate location weights**

For a common flavor with modifier \(m\):

- If \(m \geq 0\): weight = \(25 + 50m\).
- If \(m < 0\): weight = \(\max(0.5,\ 25 + 13.5m)\).

Examples:

| Modifier | Common flavor weight |
|---|---:|
| None | 25 |
| + | 75 |
| ++ | 125 |
| − | 11.5 |
| −− | 0.5 |

These are **weights, not percentages**.

For a rare flavor:

- Without a positive modifier: weight = 0.
- With positive modifier \(m\): weight = \(70m\).

Rare flavors have no negative modifiers. An unsupported rare flavor must remain at zero throughout every subsequent calculation.

Normalize all seven weights by dividing each by their total. This produces the location probability distribution, called \(L\).

There is currently **no combined rare-probability restriction**: that cap is set to 100%.

A single negative on otherwise neutral ground therefore reduces the affected flavor from 25% to approximately **13.2948%**. A double negative reduces it to **0.6623%**. These percentages change when other location modifiers are present.

**2. Apply seeking and the hunt outcome**

If the hunt fails, return **no successful hunt / no vessel**, rather than rolling resonance.

For a successful hunt, use effective margin:

\[
M=\max(0,\text{hunt margin})
\]

Negative margins currently impose no additional penalty.

If no desired flavor was specified, skip the seeking calculation. A rare flavor can only be selected as the target if its location probability is greater than zero.

For a valid target \(t\), calculate the seeking adjustment in **percentage points**:

\[
B=13.6M+\text{outcome bonus}
\]

| Outcome | Seeking bonus |
|---|---:|
| Basic win | 0 percentage points |
| Critical win | +9 percentage points |
| Messy critical | −20 percentage points |

Apply the outcome bonus even at margin zero.

The adjusted target probability is:

\[
T=\operatorname{clamp}(L_t+B/100,\ 0,\ C)
\]

where:

\[
C=\max(0.95,\ L_t)
\]

This caps increases from seeking at 95%, while preserving any location probability that was already above 95%.

Redistribute the remaining probability among the other flavors **in proportion to their location probabilities**:

\[
P_t=T
\]

\[
P_i=L_i\frac{1-T}{1-L_t}\quad\text{for }i\neq t
\]

If no target was selected, initially set \(P=L\).

**3. Apply messy-critical chaos**

This step happens **after seeking and its cap**.

On a messy critical, blend the distribution with 50% chaos:

\[
P_{\text{final}}=0.5P+0.5U
\]

With a valid target, \(U\) distributes probability equally among all eligible flavors **except the desired flavor**.

Without a target, \(U\) distributes probability equally among all eligible flavors.

Eligible flavors are all four common flavors plus rare flavors with positive location support. Unsupported rare flavors are excluded.

Consequently, a targeted messy critical halves the desired flavor’s probability after applying its −20 percentage-point seeking penalty. The redistributed probability goes toward the other eligible flavors.

For other successful outcomes, \(P_{\text{final}}=P\).

**4. Calculate intensity separately**

Intensity has four possible results:

| Intensity | Base weight | Growth coefficient |
|---|---:|---:|
| No resonance | 50 | 0 |
| Fleeting | 30 | 1 |
| Intense | 16 | 1.76 |
| Acute | 4 | 2.28 |

Calculate intensity shift:

\[
S=0.235M+\text{outcome intensity shift}
\]

| Outcome | Intensity shift |
|---|---:|
| Basic win | 0 |
| Critical win | 0.445 |
| Messy critical | 1.5 |

For each intensity category \(j\):

\[
W_j=\text{base weight}_j\times e^{(\text{growth coefficient}_j\times S)}
\]

Normalize these four weights to obtain intensity probabilities.

Under the current settings, **location modifiers and target matching do not affect intensity**. Flavor and intensity are independent. Messy criticals strongly favor higher intensity regardless of whether the desired flavor was found.

**5. Produce a random result**

Use separate random draws for flavor and intensity, each sampled from its normalized distribution.

If intensity is **No resonance**, return that result without a flavor. Otherwise return the sampled flavor and intensity.

The flavor distribution describes the flavor **conditional on resonance being present**. For example:

\[
P(\text{Ischemic and Acute})
=
P_{\text{final}}(\text{Ischemic})\times P(\text{Acute})
\]

Do not treat the flavor percentage alone as the chance of obtaining resonant blood.

**Verification case**

Location: **Ischemic +, Sanguine −, Melancholic −**. Desired flavor: **Ischemic**.

The location weights are:

- Choleric: 25
- Phlegmatic: 25
- Sanguine: 11.5
- Melancholic: 11.5
- Ischemic: 70
- Primal and Mercurial: 0

Total weight = 143. Ischemic’s location probability is therefore **48.9510%**.

At hunt margin **+3**, the implementation should produce:

| Outcome | Ischemic flavor | No resonance | Fleeting | Intense | Acute |
|---|---:|---:|---:|---:|---:|
| Basic win | 89.7510% | 26.8805% | 32.6412% | 29.7481% | 10.7303% |
| Critical win | 95.0000% | 15.5814% | 29.5255% | 37.7371% | 17.1560% |
| Messy critical | 34.8755% | 2.9280% | 15.9345% | 45.4076% | 35.7298% |

The flavor column is a separate distribution from the four intensity columns; those five columns should not be added together.