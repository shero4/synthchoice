# Sample Experiment 1: Which Tech Bro Laptop Should You Buy?

A fun experiment comparing laptop choices across different tech personas.

---

## Alternatives

| Name | Description |
|------|-------------|
| MacBook Pro 14" | The classic flex. M3 chip, space gray, dongles sold separately |
| ThinkPad X1 Carbon | Corporate stealth mode. Your IT department approves |
| Framework 16 | "I built this myself" energy. Fully repairable |
| ASUS ROG Zephyrus | RGB everything. "It's for ML training, I swear" |

---

## Feature Schema

| Key | Label | Type | Details |
|-----|-------|------|---------|
| `price` | Price | continuous | Min: 999, Max: 3499, Unit: USD |
| `weight` | Weight | continuous | Min: 1.2, Max: 2.8, Unit: kg |
| `repairability` | Repairability | categorical | "Impossible", "Hard", "Easy" |
| `flex_factor` | Flex Factor | categorical | "Coffee Shop Cred", "Corporate Stealth", "RGB Gamer Energy", "Hacker Vibes" |
| `has_touchbar` | Has TouchBar | binary | Yes/No |

---

## Alternatives Data

### MacBook Pro 14"
- **price:** 2499
- **weight:** 1.6
- **repairability:** Impossible
- **flex_factor:** Coffee Shop Cred
- **has_touchbar:** false

### ThinkPad X1 Carbon
- **price:** 1899
- **weight:** 1.12
- **repairability:** Hard
- **flex_factor:** Corporate Stealth
- **has_touchbar:** false

### Framework 16
- **price:** 1399
- **weight:** 2.1
- **repairability:** Easy
- **flex_factor:** Hacker Vibes
- **has_touchbar:** false

### ASUS ROG Zephyrus
- **price:** 1799
- **weight:** 2.5
- **repairability:** Hard
- **flex_factor:** RGB Gamer Energy
- **has_touchbar:** false

---

## Agent Segments

### 1. SF Tech Bros (15 agents)
- **Location:** San Francisco
- **Personality:** ENTJ
- **Price Sensitivity:** 0.2 (money is no object)
- **Risk Tolerance:** 0.7
- **Consistency:** 0.8

*Profile: Works at a Series B startup. Expense account vibes. Needs to look good at Blue Bottle.*

### 2. Berlin Startup Devs (15 agents)
- **Location:** Berlin
- **Personality:** INTP
- **Price Sensitivity:** 0.7 (bootstrapped mindset)
- **Risk Tolerance:** 0.6
- **Consistency:** 0.7

*Profile: Values sustainability and repairability. Probably runs Linux. Has opinions about capitalism.*

### 3. Finance Consultants (10 agents)
- **Location:** Mumbai
- **Personality:** ESTJ
- **Price Sensitivity:** 0.3
- **Risk Tolerance:** 0.2 (needs reliable)
- **Consistency:** 0.9

*Profile: Excel is life. Needs something that "just works" and won't embarrass them in client meetings.*

### 4. CS Students (20 agents)
- **Location:** Bangalore
- **Personality:** ISTP
- **Price Sensitivity:** 0.95 (broke)
- **Risk Tolerance:** 0.8
- **Consistency:** 0.5 (easily swayed by RGB)

*Profile: Wants gaming capability but tells parents it's for "coding". Budget is whatever internship pays.*

---

## Task Plan

- **Choice Format:** AB (2 options per task)
- **Tasks per Agent:** 15
- **Randomize Order:** Yes
- **Holdout Tasks:** 2
- **Repeat Tasks:** 2

---

## Expected Insights

- SF Tech Bros will overwhelmingly choose MacBook (flex factor + low price sensitivity)
- Berlin Devs will favor Framework (repairability matters)
- CS Students are wild cards - price vs RGB is the eternal struggle
- Finance Consultants split between MacBook (status) and ThinkPad (reliability)

---

## Sprite Ideas

| Alternative | Sprite Concept |
|-------------|----------------|
| MacBook Pro | Sleek silver rectangle with an apple logo, wearing AirPods |
| ThinkPad | Black rectangle with a red TrackPoint nose, wearing a tie |
| Framework | Modular robot made of puzzle pieces, holding a screwdriver |
| ROG Zephyrus | Glowing RGB rectangle with gaming headset, energy drink nearby |
