# Sample Experiment 2: The Ultimate Lunch Delivery Dilemma

What to order when the team is hungry, indecisive, and the standup ran 30 minutes over?

---

## Alternatives

| Name | Description |
|------|-------------|
| Hyderabadi Biryani | The OG. Comes with mirchi ka salan. Will put you to sleep |
| Domino's Pizza | Guaranteed to arrive. Cheese burst or bust |
| Subway | "Healthy" in quotes. Footlong or 6-inch debate incoming |
| Salad Bowl | From that new cloud kitchen. Instagram-ready. Still hungry after |
| Office Pantry Maggi | 2-minute noodles. Zero delivery time. Maximum nostalgia |

---

## Feature Schema

| Key | Label | Type | Details |
|-----|-------|------|---------|
| `price` | Price | continuous | Min: 30, Max: 600, Unit: INR |
| `arrival_time` | Arrival Time | continuous | Min: 2, Max: 45, Unit: minutes |
| `sharing_friendly` | Sharing Friendly | binary | Yes/No (can you share with team?) |
| `regret_factor` | Regret Factor | categorical | "None", "Mild", "Food Coma", "Why Did I Do This" |
| `instagram_worthy` | Instagram Worthy | binary | Yes/No |

---

## Alternatives Data

### Hyderabadi Biryani
- **price:** 350
- **arrival_time:** 35
- **sharing_friendly:** true
- **regret_factor:** Food Coma
- **instagram_worthy:** true

### Domino's Pizza
- **price:** 450
- **arrival_time:** 25
- **sharing_friendly:** true
- **regret_factor:** Mild
- **instagram_worthy:** false

### Subway
- **price:** 380
- **arrival_time:** 30
- **sharing_friendly:** false
- **regret_factor:** None
- **instagram_worthy:** false

### Salad Bowl
- **price:** 320
- **arrival_time:** 40
- **sharing_friendly:** false
- **regret_factor:** None
- **instagram_worthy:** true

### Office Pantry Maggi
- **price:** 30
- **arrival_time:** 5
- **sharing_friendly:** true
- **regret_factor:** Why Did I Do This
- **instagram_worthy:** false

---

## Agent Segments

### 1. Fitness Influencer Interns (15 agents)
- **Location:** Mumbai
- **Personality:** ESFP
- **Price Sensitivity:** 0.6
- **Risk Tolerance:** 0.4 (scared of carbs)
- **Consistency:** 0.6

*Profile: Posts gym selfies. Meal preps on Sunday. But it's Friday and they're tired...*

### 2. Hungry Backend Developers (20 agents)
- **Location:** Bangalore
- **Personality:** INTP
- **Price Sensitivity:** 0.5
- **Risk Tolerance:** 0.8 (will try anything)
- **Consistency:** 0.4 (hangry decisions)

*Profile: Last ate 6 hours ago. In a debugging trance. Needs calories NOW. Speed > everything.*

### 3. Frugal Startup Founders (10 agents)
- **Location:** Delhi
- **Personality:** ENTJ
- **Price Sensitivity:** 0.95 (every rupee counts pre-revenue)
- **Risk Tolerance:** 0.7
- **Consistency:** 0.8

*Profile: Burns money on AWS but won't spend on lunch. Maggi enthusiast. "We're default alive."*

### 4. "Treat Yourself" Team Leads (15 agents)
- **Location:** Gurgaon
- **Personality:** ENFJ
- **Price Sensitivity:** 0.2 (it's on the company card)
- **Risk Tolerance:** 0.5
- **Consistency:** 0.7

*Profile: It's been a long week. The sprint is done. Biryani is self-care. Will expense it.*

---

## Task Plan

- **Choice Format:** ABC (3 options per task)
- **Tasks per Agent:** 12
- **Randomize Order:** Yes
- **Holdout Tasks:** 2
- **Repeat Tasks:** 2

---

## Expected Insights

- **Biryani** dominates among Team Leads (price insensitive + comfort food)
- **Maggi** wins with Founders (extreme price sensitivity, instant gratification)
- **Developers** split between Pizza (sharing + speed) and Biryani (calories)
- **Interns** want Salad Bowl but secretly wish they ordered Biryani
- **Instagram-worthiness** matters more than people admit

---

## Sprite Ideas

| Alternative | Sprite Concept |
|-------------|----------------|
| Biryani | Steaming dum pot with a regal crown, looking majestic |
| Pizza | Cheesy slice with sunglasses, dripping cheese swagger |
| Subway | Long baguette sandwich flexing its "healthy" muscles |
| Salad Bowl | Smug bowl with kale hair, holding a yoga mat |
| Maggi | Humble orange packet with a cape, superhero of broke times |

---

## Fun Predictions to Show Judges

1. "Despite claiming to be healthy, 73% of Fitness Interns chose Biryani on Friday"
2. "Maggi's price-to-satisfaction ratio makes it the rational choice, yet only Founders picked it"
3. "Instagram-worthy increased choice probability by 23% among under-25 agents"
4. "Food Coma regret factor had zero impact on hungry developers"
